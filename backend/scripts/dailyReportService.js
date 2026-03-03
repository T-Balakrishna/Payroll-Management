import { Op } from 'sequelize';
import { pathToFileURL } from 'url';
import db from '../models/index.js';
import { sendMail } from '../services/mailService.js';

const { ShiftType, ShiftAssignment, Employee, BiometricPunch, LeaveRequest, Department, User, Role } = db;

const JOB_PREFIX = '[daily-report-job]';
const MAIL_PREFIX = '[daily-report-mail]';

let isDailyReportJobRunning = false;
const sentAbsentAlertsByDate = new Map();

const WEEKDAY_NAME_TO_INDEX = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

const parseRoleNames = (value, defaults) => {
  const raw = String(value || '').trim();
  if (!raw) return defaults;
  return raw.split(',').map((v) => v.trim()).filter(Boolean);
};

const DEPT_ADMIN_ROLE_NAMES = parseRoleNames(process.env.DAILY_REPORT_DEPT_ADMIN_ROLES, ['Department Admin', 'Dept Admin', 'HOD']);
const HR_ADMIN_ROLE_NAMES = parseRoleNames(process.env.DAILY_REPORT_HR_ADMIN_ROLES, ['HR Admin', 'HR', 'Super Admin', 'Admin']);

const fullName = (employee) =>
  [employee?.firstName, employee?.lastName].map((v) => String(v || '').trim()).filter(Boolean).join(' ') || `Staff-${employee?.staffId || ''}`;

const pickEmployeeEmail = (employee) => employee?.officialEmail || employee?.personalEmail || null;
const uniqueStrings = (values) => [...new Set(values.filter(Boolean))];

const getZonedDateParts = (date, timeZone) => {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    hour12: false, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone,
  });
  const parts = dtf.formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    year: Number(map.year), month: Number(map.month), day: Number(map.day),
    hour: Number(map.hour), minute: Number(map.minute), second: Number(map.second),
  };
};

const toDateOnlyInTimeZone = (date, timeZone) => {
  const p = getZonedDateParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
};

const toMinutesFromTime = (timeValue) => {
  if (!timeValue) return null;
  const [h, m] = String(timeValue).slice(0, 8).split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return (h * 60 + m) % 1440;
};

const isShiftDueAtCurrentMinute = (shiftStartTime, now, timeZone, offsetMinutes = 30) => {
  const startMinutes = toMinutesFromTime(shiftStartTime);
  if (startMinutes == null) return false;
  const nowParts = getZonedDateParts(now, timeZone);
  const currentMinutes = nowParts.hour * 60 + nowParts.minute;
  return ((startMinutes + offsetMinutes) % 1440) === currentMinutes;
};

const isAssignmentApplicableOnDate = (assignment, dateOnly) => {
  if (!assignment || assignment.status !== 'Active') return false;
  if (assignment.startDate && dateOnly < assignment.startDate) return false;
  if (assignment.endDate && dateOnly > assignment.endDate) return false;
  if (!assignment.isRecurring) return true;

  const recurringPattern = assignment.recurringPattern;
  if (!recurringPattern) return false;
  if (recurringPattern === 'daily') return true;

  const date = new Date(`${dateOnly}T00:00:00`);
  if (recurringPattern === 'weekly') {
    let days = assignment.recurringDays;
    if (typeof days === 'string') { try { days = JSON.parse(days); } catch { days = []; } }
    if (Array.isArray(days) && days.length > 0 && typeof days[0] === 'string') {
      days = days.map((d) => WEEKDAY_NAME_TO_INDEX[String(d).toLowerCase()]).filter((d) => Number.isInteger(d));
    }
    return Array.isArray(days) ? days.includes(date.getDay()) : false;
  }

  if (recurringPattern === 'monthly') {
    if (assignment.startDate) {
      const baseDate = new Date(`${assignment.startDate}T00:00:00`);
      return baseDate.getDate() === date.getDate();
    }
    return true;
  }

  return true;
};

const buildShiftStartDate = (dateOnly, shiftStartTime) => {
  if (!dateOnly || !shiftStartTime) return null;
  const timePart = String(shiftStartTime).slice(0, 8);
  const dt = new Date(`${dateOnly}T${timePart}`);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const pickFirstPunchByStaff = (punches) => {
  const firstByStaff = new Map();
  for (const punch of punches) {
    const key = String(punch.staffId);
    if (!firstByStaff.has(key)) firstByStaff.set(key, punch);
  }
  return firstByStaff;
};

const buildStatus = ({ firstPunch, shiftStart, hasApprovedLeave }) => {
  if (firstPunch) {
    if (shiftStart && new Date(firstPunch.punchTimestamp) <= shiftStart) return 'Present';
    return 'Late';
  }
  if (hasApprovedLeave) return 'Leave';
  return 'Absent';
};

// ─── Status badge helper ───────────────────────────────────────────────────────
const STATUS_STYLE = {
  Present: { bg: '#f6ffed', color: '#237804', border: '#b7eb8f', rowBg: '#f6ffed', accent: '#52c41a' },
  Late:    { bg: '#fffbe6', color: '#7c4a00', border: '#ffe58f', rowBg: '#fffdf0', accent: '#faad14' },
  Leave:   { bg: '#e6f7ff', color: '#004d80', border: '#91d5ff', rowBg: '#f0f9ff', accent: '#1890ff' },
  Absent:  { bg: '#fff1f0', color: '#a8071a', border: '#ffa39e', rowBg: '#fff5f5', accent: '#ff4d4f' },
};

const statusBadge = (status) => {
  const s = STATUS_STYLE[status] || { bg: '#f5f5f5', color: '#555', border: '#d9d9d9' };
  return `<span style="display:inline-block;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.4px;background:${s.bg};color:${s.color};border:1px solid ${s.border};text-transform:uppercase;">${status}</span>`;
};

// ─── Summary count bar ────────────────────────────────────────────────────────
const buildSummaryBar = (rows) => {
  const counts = rows.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
  const total = rows.length;

  const cards = [
    { label: 'Total',   icon: '&#x1F4CB;', count: total,                      bg: '#f0f2f8', color: '#1a237e', border: '#c5cae9' },
    { label: 'Present', icon: '&#x2705;',  count: counts['Present'] || 0,     bg: '#f6ffed', color: '#237804', border: '#b7eb8f' },
    { label: 'Late',    icon: '&#x1F550;', count: counts['Late']    || 0,     bg: '#fffbe6', color: '#7c4a00', border: '#ffe58f' },
    { label: 'Leave',   icon: '&#x1F3D6;', count: counts['Leave']   || 0,     bg: '#e6f7ff', color: '#004d80', border: '#91d5ff' },
    { label: 'Absent',  icon: '&#x1F6A8;', count: counts['Absent']  || 0,     bg: '#fff1f0', color: '#a8071a', border: '#ffa39e' },
  ]
    .map(
      (c) => `
        <td style="padding:0 5px;">
          <div style="background:${c.bg};border:1px solid ${c.border};border-radius:10px;padding:12px 8px;text-align:center;min-width:90px;">
            <div style="font-size:18px;margin-bottom:3px;">${c.icon}</div>
            <div style="font-size:20px;font-weight:800;color:${c.color};line-height:1.1;">${c.count}</div>
            <div style="font-size:11px;color:${c.color};font-weight:600;margin-top:2px;">${c.label}</div>
          </div>
        </td>`
    )
    .join('');

  return `
    <tr>
      <td style="padding:20px 30px 8px;">
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr>${cards}</tr>
        </table>
      </td>
    </tr>`;
};

// ─── Absent alert email ────────────────────────────────────────────────────────
const buildAbsentReminderHtml = ({ employeeName, date }) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Attendance Alert</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f6fb;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#c0392b 0%,#e74c3c 100%);padding:36px;text-align:center;">
            <div style="font-size:44px;line-height:1;margin-bottom:10px;">&#x1F6A8;</div>
            <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#ffffff;">Attendance Alert</h1>
            <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.85);">Action may be required</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 36px;">
            <p style="margin:0 0 20px;font-size:15px;color:#333;">Dear <strong>${employeeName}</strong>,</p>

            <div style="background:#fff5f5;border:1px solid #ffa39e;border-left:4px solid #e74c3c;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
              <p style="margin:0;font-size:15px;color:#c0392b;font-weight:600;">
                &#x26A0;&#xFE0F;&nbsp; You have been marked <strong>Absent</strong> for <strong>${date}</strong>.
              </p>
            </div>

            <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
              If this absence is due to planned or unplanned leave, please submit your leave request at the earliest to ensure your records are updated accurately.
            </p>

            <p style="margin:0;font-size:14px;color:#555;">
              Regards,<br />
              <strong style="color:#333;">HR Team</strong>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f9;border-top:1px solid #f0f0f0;padding:16px 36px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#bbb;">This is an automated attendance alert from your HR system. Please do not reply directly to this email.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ─── Department report email ───────────────────────────────────────────────────
const buildDepartmentReportHtml = ({ departmentName, date, rows }) => {
  const tableRows = rows
    .map((r, i) => {
      const s = STATUS_STYLE[r.status] || { rowBg: '#ffffff', accent: '#d9d9d9' };
      const zebra = i % 2 === 0 ? '#ffffff' : '#fafafa';
      const bg = r.status !== 'Present' ? s.rowBg : zebra;
      return `
        <tr style="border-bottom:1px solid #f0f0f0;background:${bg};">
          <td style="padding:11px 14px;font-size:13px;color:#555;border-left:3px solid ${s.accent};">${r.employeeId}</td>
          <td style="padding:11px 14px;font-size:13px;color:#222;font-weight:600;">${r.employeeName}</td>
          <td style="padding:11px 14px;font-size:13px;color:#666;">${r.shiftName}</td>
          <td style="padding:11px 14px;">${statusBadge(r.status)}</td>
          <td style="padding:11px 14px;font-size:13px;color:#555;font-variant-numeric:tabular-nums;">${r.punchTime || '&mdash;'}</td>
        </tr>`;
    })
    .join('');

  // Build summary counts for dept report
  const counts = rows.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
  const total = rows.length;
  const summaryItems = [
    { label: 'Total',   count: total,                  color: '#1a237e', bg: '#f0f2f8', border: '#c5cae9' },
    { label: 'Present', count: counts['Present'] || 0, color: '#237804', bg: '#f6ffed', border: '#b7eb8f' },
    { label: 'Late',    count: counts['Late']    || 0, color: '#7c4a00', bg: '#fffbe6', border: '#ffe58f' },
    { label: 'Leave',   count: counts['Leave']   || 0, color: '#004d80', bg: '#e6f7ff', border: '#91d5ff' },
    { label: 'Absent',  count: counts['Absent']  || 0, color: '#a8071a', bg: '#fff1f0', border: '#ffa39e' },
  ]
    .map(
      (c) => `
        <td style="padding:0 5px;">
          <div style="background:${c.bg};border:1px solid ${c.border};border-radius:10px;padding:12px 8px;text-align:center;min-width:85px;">
            <div style="font-size:22px;font-weight:800;color:${c.color};line-height:1.1;">${c.count}</div>
            <div style="font-size:11px;color:${c.color};font-weight:600;margin-top:3px;">${c.label}</div>
          </div>
        </td>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Department Attendance Report</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f6fb;padding:32px 0;">
    <tr><td align="center">
      <table width="680" cellspacing="0" cellpadding="0" style="max-width:680px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a237e 0%,#283593 100%);padding:32px 36px;text-align:center;">
            <div style="font-size:36px;margin-bottom:8px;">&#x1F4CB;</div>
            <h1 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#ffffff;">Department Attendance Report</h1>
            <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.80);">${departmentName} &nbsp;&bull;&nbsp; ${date}</p>
          </td>
        </tr>

        <!-- Summary counts -->
        <tr>
          <td style="padding:22px 30px 8px;">
            <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.6px;">Summary</p>
            <table width="100%" cellspacing="0" cellpadding="0">
              <tr>${summaryItems}</tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:12px 30px 0;"><hr style="border:none;border-top:1px solid #eee;margin:0;" /></td></tr>

        <!-- Table -->
        <tr>
          <td style="padding:16px 30px 24px;">
            <table width="100%" cellspacing="0" cellpadding="0" style="border-radius:10px;overflow:hidden;border:1px solid #e8e8e8;">
              <thead>
                <tr style="background:linear-gradient(90deg,#1a237e 0%,#3949ab 100%);">
                  <th style="padding:11px 14px;text-align:left;font-size:11px;color:#fff;text-transform:uppercase;letter-spacing:0.6px;font-weight:700;">Emp ID</th>
                  <th style="padding:11px 14px;text-align:left;font-size:11px;color:#fff;text-transform:uppercase;letter-spacing:0.6px;font-weight:700;">Name</th>
                  <th style="padding:11px 14px;text-align:left;font-size:11px;color:#fff;text-transform:uppercase;letter-spacing:0.6px;font-weight:700;">Shift</th>
                  <th style="padding:11px 14px;text-align:left;font-size:11px;color:#fff;text-transform:uppercase;letter-spacing:0.6px;font-weight:700;">Status</th>
                  <th style="padding:11px 14px;text-align:left;font-size:11px;color:#fff;text-transform:uppercase;letter-spacing:0.6px;font-weight:700;">Punch Time</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
          </td>
        </tr>

        <!-- Sign-off -->
        <tr>
          <td style="padding:0 36px 28px;">
            <p style="margin:0;font-size:14px;color:#555;">
              Regards,<br />
              <strong style="color:#333;">HR Team</strong>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f9;border-top:1px solid #f0f0f0;padding:14px 36px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#bbb;">This is an automated report from your HR system. Please do not reply directly to this email.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

// ─── HR summary report email ───────────────────────────────────────────────────
const buildHrSummaryHtml = ({ date, rows }) => {
  const statusCounts = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
  const total = rows.length;

  const summaryCards = [
    { label: 'Total',   iconHtml: '&#x1F4CB;', count: total,                       bg: '#f0f2f8', color: '#1a237e', border: '#c5cae9' },
    { label: 'Present', iconHtml: '&#x2705;',  count: statusCounts['Present'] || 0, bg: '#f6ffed', color: '#237804', border: '#b7eb8f' },
    { label: 'Late',    iconHtml: '&#x1F550;', count: statusCounts['Late']    || 0, bg: '#fffbe6', color: '#7c4a00', border: '#ffe58f' },
    { label: 'Leave',   iconHtml: '&#x1F3D6;', count: statusCounts['Leave']   || 0, bg: '#e6f7ff', color: '#004d80', border: '#91d5ff' },
    { label: 'Absent',  iconHtml: '&#x1F6A8;', count: statusCounts['Absent']  || 0, bg: '#fff1f0', color: '#a8071a', border: '#ffa39e' },
  ]
    .map(
      (c) => `
        <td style="padding:0 5px;">
          <div style="background:${c.bg};border:1px solid ${c.border};border-radius:10px;padding:14px 10px;text-align:center;min-width:100px;">
            <div style="font-size:22px;margin-bottom:4px;">${c.iconHtml}</div>
            <div style="font-size:22px;font-weight:800;color:${c.color};">${c.count}</div>
            <div style="font-size:12px;color:${c.color};font-weight:600;">${c.label}</div>
          </div>
        </td>`
    )
    .join('');

  const tableRows = rows
    .map((r, i) => {
      const s = STATUS_STYLE[r.status] || { rowBg: '#ffffff', accent: '#d9d9d9' };
      const zebra = i % 2 === 0 ? '#ffffff' : '#fafafa';
      const bg = r.status !== 'Present' ? s.rowBg : zebra;
      return `
        <tr style="border-bottom:1px solid #f0f0f0;background:${bg};">
          <td style="padding:9px 10px;font-size:12px;color:#666;border-left:3px solid ${s.accent};">${r.companyId || '&mdash;'}</td>
          <td style="padding:9px 10px;font-size:12px;color:#555;">${r.departmentName || '&mdash;'}</td>
          <td style="padding:9px 10px;font-size:12px;color:#555;">${r.employeeId}</td>
          <td style="padding:9px 10px;font-size:13px;color:#222;font-weight:600;">${r.employeeName}</td>
          <td style="padding:9px 10px;font-size:12px;color:#666;">${r.shiftName}</td>
          <td style="padding:9px 10px;">${statusBadge(r.status)}</td>
          <td style="padding:9px 10px;font-size:12px;color:#555;font-variant-numeric:tabular-nums;">${r.punchTime || '&mdash;'}</td>
        </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>HR Attendance Full Report</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f6fb;padding:32px 0;">
    <tr><td align="center">
      <table width="720" cellspacing="0" cellpadding="0" style="max-width:720px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%);padding:32px 36px;text-align:center;">
            <div style="font-size:36px;margin-bottom:8px;">&#x1F4CA;</div>
            <h1 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#ffffff;">HR Attendance Full Report</h1>
            <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.75);">${date}</p>
          </td>
        </tr>

        <!-- Summary Cards -->
        <tr>
          <td style="padding:24px 30px 8px;">
            <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.6px;">Summary</p>
            <table width="100%" cellspacing="0" cellpadding="0">
              <tr>${summaryCards}</tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:12px 30px 0;"><hr style="border:none;border-top:1px solid #eee;margin:0;" /></td></tr>

        <!-- Detail Table -->
        <tr>
          <td style="padding:16px 30px 28px;">
            <table width="100%" cellspacing="0" cellpadding="0" style="border-radius:10px;overflow:hidden;border:1px solid #e8e8e8;">
              <thead>
                <tr style="background:linear-gradient(90deg,#0f2027 0%,#2c5364 100%);">
                  <th style="padding:10px;text-align:left;font-size:11px;color:#fff;text-transform:uppercase;letter-spacing:0.6px;font-weight:700;">Company</th>
                  <th style="padding:10px;text-align:left;font-size:11px;color:#fff;text-transform:uppercase;letter-spacing:0.6px;font-weight:700;">Dept</th>
                  <th style="padding:10px;text-align:left;font-size:11px;color:#fff;text-transform:uppercase;letter-spacing:0.6px;font-weight:700;">Emp ID</th>
                  <th style="padding:10px;text-align:left;font-size:11px;color:#fff;text-transform:uppercase;letter-spacing:0.6px;font-weight:700;">Name</th>
                  <th style="padding:10px;text-align:left;font-size:11px;color:#fff;text-transform:uppercase;letter-spacing:0.6px;font-weight:700;">Shift</th>
                  <th style="padding:10px;text-align:left;font-size:11px;color:#fff;text-transform:uppercase;letter-spacing:0.6px;font-weight:700;">Status</th>
                  <th style="padding:10px;text-align:left;font-size:11px;color:#fff;text-transform:uppercase;letter-spacing:0.6px;font-weight:700;">Punch Time</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
          </td>
        </tr>

        <!-- Sign-off -->
        <tr>
          <td style="padding:0 36px 28px;">
            <p style="margin:0;font-size:14px;color:#555;">
              Regards,<br />
              <strong style="color:#333;">HR Team</strong>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f9;border-top:1px solid #f0f0f0;padding:14px 36px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#bbb;">This is an automated report from your HR system. Please do not reply directly to this email.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

const cleanupOldAbsentDedupState = (dateOnly) => {
  for (const key of sentAbsentAlertsByDate.keys()) {
    if (key !== dateOnly) sentAbsentAlertsByDate.delete(key);
  }
};

const absentDedupKey = (shiftId, employeeId) => `${shiftId}::${employeeId}`;

const wasAbsentAlertSent = ({ dateOnly, shiftId, employeeId }) => {
  const set = sentAbsentAlertsByDate.get(dateOnly);
  if (!set) return false;
  return set.has(absentDedupKey(shiftId, employeeId));
};

const markAbsentAlertSent = ({ dateOnly, shiftId, employeeId }) => {
  let set = sentAbsentAlertsByDate.get(dateOnly);
  if (!set) { set = new Set(); sentAbsentAlertsByDate.set(dateOnly, set); }
  set.add(absentDedupKey(shiftId, employeeId));
};

const generateDailyReportsForDueShifts = async ({
  now = new Date(),
  timeZone = process.env.DAILY_REPORT_TIMEZONE || 'Asia/Kolkata',
  dueOffsetMinutes = 30,
} = {}) => {
  const dateOnly = toDateOnlyInTimeZone(now, timeZone);

  const activeShifts = await ShiftType.findAll({
    where: { status: 'Active' },
    attributes: ['shiftTypeId', 'companyId', 'name', 'startTime'],
  });

  const dueShifts = activeShifts.filter((shift) =>
    isShiftDueAtCurrentMinute(shift.startTime, now, timeZone, dueOffsetMinutes)
  );

  if (dueShifts.length === 0) {
    return { date: dateOnly, dueShiftIds: [], rowsPrepared: 0, touched: false, rows: [] };
  }

  const dueShiftIds = dueShifts.map((s) => s.shiftTypeId);
  const shiftById = new Map(dueShifts.map((s) => [String(s.shiftTypeId), s]));

  const assignments = await ShiftAssignment.findAll({
    where: {
      shiftTypeId: { [Op.in]: dueShiftIds },
      status: 'Active',
      [Op.and]: [
        { [Op.or]: [{ startDate: null }, { startDate: { [Op.lte]: dateOnly } }] },
        { [Op.or]: [{ endDate: null }, { endDate: { [Op.gte]: dateOnly } }] },
      ],
    },
    attributes: ['shiftAssignmentId', 'staffId', 'shiftTypeId', 'companyId', 'status', 'startDate', 'endDate', 'isRecurring', 'recurringPattern', 'recurringDays'],
    include: [{
      model: Employee,
      as: 'employee',
      required: true,
      where: { status: 'Active', employmentStatus: 'Active' },
      attributes: ['staffId', 'companyId', 'departmentId', 'firstName', 'lastName', 'officialEmail', 'personalEmail'],
    }],
  });

  const applicableAssignments = assignments.filter((a) => isAssignmentApplicableOnDate(a, dateOnly));
  if (applicableAssignments.length === 0) {
    return { date: dateOnly, dueShiftIds, rowsPrepared: 0, touched: false, rows: [] };
  }

  const staffIds = [...new Set(applicableAssignments.map((a) => a.staffId))];
  const departmentIds = [...new Set(applicableAssignments.map((a) => a.employee?.departmentId).filter(Boolean))];

  const [punches, approvedLeaves, departments] = await Promise.all([
    BiometricPunch.findAll({
      where: { staffId: { [Op.in]: staffIds }, punchDate: dateOnly, status: { [Op.ne]: 'Invalid' } },
      attributes: ['staffId', 'punchTimestamp'],
      order: [['staffId', 'ASC'], ['punchTimestamp', 'ASC']],
    }),
    LeaveRequest.findAll({
      where: { staffId: { [Op.in]: staffIds }, status: 'Approved', startDate: { [Op.lte]: dateOnly }, endDate: { [Op.gte]: dateOnly } },
      attributes: ['staffId'],
      order: [['updatedAt', 'DESC']],
    }),
    departmentIds.length
      ? Department.findAll({ where: { departmentId: { [Op.in]: departmentIds } }, attributes: ['departmentId', 'departmentName'] })
      : [],
  ]);

  const deptNameById = new Map(departments.map((d) => [String(d.departmentId), d.departmentName]));
  const firstPunchByStaff = pickFirstPunchByStaff(punches);
  const leaveByStaff = new Set(approvedLeaves.map((l) => String(l.staffId)));

  const rows = applicableAssignments.map((assignment) => {
    const emp = assignment.employee;
    const shift = shiftById.get(String(assignment.shiftTypeId));
    const firstPunch = firstPunchByStaff.get(String(emp.staffId)) || null;
    const shiftStart = buildShiftStartDate(dateOnly, shift?.startTime);
    const status = buildStatus({ firstPunch, shiftStart, hasApprovedLeave: leaveByStaff.has(String(emp.staffId)) });

    return {
      date: dateOnly,
      shiftId: assignment.shiftTypeId,
      shiftName: shift?.name || `Shift-${assignment.shiftTypeId}`,
      companyId: emp.companyId,
      departmentId: emp.departmentId || null,
      departmentName: deptNameById.get(String(emp.departmentId || '')) || null,
      employeeId: emp.staffId,
      employeeName: fullName(emp),
      employeeEmail: pickEmployeeEmail(emp),
      status,
      punchTime: firstPunch?.punchTimestamp || null,
      punchTimeDisplay: firstPunch?.punchTimestamp
        ? new Date(firstPunch.punchTimestamp).toLocaleString('en-IN', { hour12: false })
        : null,
    };
  });

  console.log(`${JOB_PREFIX} date=${dateOnly} dueShifts=${dueShiftIds.length} rows=${rows.length}`);
  return { date: dateOnly, dueShiftIds, rowsPrepared: rows.length, touched: rows.length > 0, rows };
};

const sendAbsentEmployeeAlerts = async ({ date, rows }) => {
  const absentRows = rows.filter((r) => r.status === 'Absent');
  if (absentRows.length === 0) return { attempted: 0, sent: 0 };

  let attempted = 0;
  let sent = 0;

  for (const row of absentRows) {
    if (!row.employeeEmail) continue;
    if (wasAbsentAlertSent({ dateOnly: date, shiftId: row.shiftId, employeeId: row.employeeId })) continue;

    attempted += 1;
    try {
      await sendMail({
        to: row.employeeEmail,
        subject: `Absent Alert`,
        html: buildAbsentReminderHtml({ employeeName: row.employeeName, date }),
      });
      markAbsentAlertSent({ dateOnly: date, shiftId: row.shiftId, employeeId: row.employeeId });
      sent += 1;
    } catch (error) {
      console.error(`${MAIL_PREFIX} absent-alert failed employeeId=${row.employeeId}: ${error.message}`);
    }
  }

  return { attempted, sent };
};

const sendDepartmentReports = async ({ date, rows }) => {
  const departmentIds = uniqueStrings(rows.map((r) => r.departmentId));
  if (departmentIds.length === 0) return { attempted: 0, sent: 0 };

  const deptAdmins = await User.findAll({
    where: { status: 'Active', departmentId: { [Op.in]: departmentIds }, userMail: { [Op.ne]: null } },
    include: [{
      model: Role,
      as: 'role',
      where: { status: 'Active', roleName: { [Op.in]: DEPT_ADMIN_ROLE_NAMES } },
      attributes: ['roleName'],
      required: true,
    }],
    attributes: ['userId', 'departmentId', 'userMail', 'userName'],
  });

  if (deptAdmins.length === 0) return { attempted: 0, sent: 0 };

  const groupedByDepartment = rows.reduce((acc, row) => {
    const key = String(row.departmentId || '0');
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key).push(row);
    return acc;
  }, new Map());

  let attempted = 0;
  let sent = 0;

  for (const admin of deptAdmins) {
    const deptRows = groupedByDepartment.get(String(admin.departmentId || '0')) || [];
    if (deptRows.length === 0) continue;

    attempted += 1;
    try {
      const deptName = deptRows[0]?.departmentName || `Department-${admin.departmentId}`;
      await sendMail({
        to: admin.userMail,
        subject: `Department Report`,
        html: buildDepartmentReportHtml({
          departmentName: deptName,
          date,
          rows: deptRows.map((r) => ({
            employeeId: r.employeeId,
            employeeName: r.employeeName,
            shiftName: r.shiftName,
            status: r.status,
            punchTime: r.punchTimeDisplay,
          })),
        }),
      });
      sent += 1;
    } catch (error) {
      console.error(`${MAIL_PREFIX} department-report failed userId=${admin.userId}: ${error.message}`);
    }
  }

  return { attempted, sent };
};

const sendHrReport = async ({ date, rows }) => {
  const hrAdmins = await User.findAll({
    where: { status: 'Active', userMail: { [Op.ne]: null } },
    include: [{
      model: Role,
      as: 'role',
      where: { status: 'Active', roleName: { [Op.in]: HR_ADMIN_ROLE_NAMES } },
      attributes: ['roleName'],
      required: true,
    }],
    attributes: ['userId', 'userMail', 'userName'],
  });

  if (hrAdmins.length === 0) return { attempted: 0, sent: 0 };

  const recipientList = uniqueStrings(hrAdmins.map((u) => u.userMail));
  if (recipientList.length === 0) return { attempted: 0, sent: 0 };

  try {
    await sendMail({
      to: recipientList.join(','),
      subject: `HR Report`,
      html: buildHrSummaryHtml({
        date,
        rows: rows.map((r) => ({
          companyId: r.companyId,
          departmentName: r.departmentName,
          employeeId: r.employeeId,
          employeeName: r.employeeName,
          shiftName: r.shiftName,
          status: r.status,
          punchTime: r.punchTimeDisplay,
        })),
      }),
    });
    return { attempted: recipientList.length, sent: recipientList.length };
  } catch (error) {
    console.error(`${MAIL_PREFIX} hr-report failed: ${error.message}`);
    return { attempted: recipientList.length, sent: 0 };
  }
};

const sendDailyReportNotifications = async ({ date, rows, shouldSendSummary = true }) => {
  cleanupOldAbsentDedupState(date);
  const absentAlerts = await sendAbsentEmployeeAlerts({ date, rows });

  let departmentReports = { attempted: 0, sent: 0 };
  let hrReport = { attempted: 0, sent: 0 };
  if (shouldSendSummary) {
    departmentReports = await sendDepartmentReports({ date, rows });
    hrReport = await sendHrReport({ date, rows });
  }

  console.log(
    `${MAIL_PREFIX} date=${date} absent(sent=${absentAlerts.sent}/${absentAlerts.attempted}) dept(sent=${departmentReports.sent}/${departmentReports.attempted}) hr(sent=${hrReport.sent}/${hrReport.attempted})`
  );

  return { absentAlerts, departmentReports, hrReport };
};

export const runDailyReportJob = async ({ now = new Date(), timeZone } = {}) => {
  const fetchResult = await generateDailyReportsForDueShifts({ now, timeZone });

  if (fetchResult.dueShiftIds.length === 0) {
    return {
      ...fetchResult,
      notifications: {
        absentAlerts: { attempted: 0, sent: 0 },
        departmentReports: { attempted: 0, sent: 0 },
        hrReport: { attempted: 0, sent: 0 },
      },
    };
  }

  const notifications = await sendDailyReportNotifications({
    date: fetchResult.date,
    rows: fetchResult.rows,
    shouldSendSummary: fetchResult.touched,
  });

  const output = { ...fetchResult, notifications };
  delete output.rows;

  console.log(`${JOB_PREFIX} completed`, output);
  return output;
};

export const startDailyReportScheduler = () => {
  const cronExpression = process.env.DAILY_REPORT_CRON_EXPRESSION || '*/5 * * * *';
  const timezone = process.env.DAILY_REPORT_TIMEZONE || 'Asia/Kolkata';

  cron.schedule(
    cronExpression,
    async () => {
      if (isDailyReportJobRunning) { console.warn('[daily-report-scheduler] previous run still active, skipping'); return; }
      isDailyReportJobRunning = true;
      try {
        await runDailyReportJob({ now: new Date(), timeZone: timezone });
      } catch (error) {
        console.error(`[daily-report-scheduler] failed: ${error.message}`);
      } finally {
        isDailyReportJobRunning = false;
      }
    },
    { timezone }
  );

  console.log(`[daily-report-scheduler] scheduled with "${cronExpression}" (${timezone})`);
};

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  const dotenv = await import('dotenv');
  dotenv.default.config();

  runDailyReportJob({ now: new Date(), timeZone: process.env.DAILY_REPORT_TIMEZONE || 'Asia/Kolkata' })
    .then((result) => { console.log('[daily-report:run-once] success', result); process.exit(0); })
    .catch((error) => { console.error('[daily-report:run-once] failed', error); process.exit(1); });
}

export default runDailyReportJob;