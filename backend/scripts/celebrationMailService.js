import cron from 'node-cron';
import { pathToFileURL } from 'url';
import db from '../models/index.js';
import { sendMail } from '../services/mailService.js';

const { Employee } = db;

const JOB_PREFIX = '[celebration-mail]';
const EVENT_TYPES = {
  BIRTHDAY: 'Birthday',
  WORK_ANNIVERSARY: 'Work Anniversary',
  MARRIAGE_ANNIVERSARY: 'Marriage Anniversary',
};

const EVENT_CONFIG = {
  [EVENT_TYPES.BIRTHDAY]: {
    label: 'Birthday',
    subject: (name) => `Happy Birthday, ${name}!`,
    personalLine: (years) => `You are celebrating your ${toOrdinal(years)} birthday today.`,
    listLine: (name, years) => `${name} (${years} years old)`,
  },
  [EVENT_TYPES.WORK_ANNIVERSARY]: {
    label: 'Work Anniversary',
    subject: (name) => `Happy Work Anniversary, ${name}!`,
    personalLine: (years) => `You are celebrating your ${toOrdinal(years)} work anniversary today.`,
    listLine: (name, years) => `${name} (${years} years of service)`,
  },
  [EVENT_TYPES.MARRIAGE_ANNIVERSARY]: {
    label: 'Marriage Anniversary',
    subject: (name) => `Happy Marriage Anniversary, ${name}!`,
    personalLine: (years) => `You are celebrating your ${toOrdinal(years)} marriage anniversary today.`,
    listLine: (name, years) => `${name} (${years} years married)`,
  },
};

// ─── Visual theme per event type ─────────────────────────────────────────────
// NOTE: All emojis replaced with HTML unicode entities for reliable email client rendering
const EVENT_THEME = {
  [EVENT_TYPES.BIRTHDAY]: {
    // 🎂 = cake
    emojiHtml: '&#x1F382;',
    headerBg: 'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)',
    accentColor: '#f857a6',
    badgeBg: '#fff0f6',
    badgeText: '#c41d7f',
    headerTitle: 'Happy Birthday!',
    headerSubtitle: 'Wishing you a wonderful day filled with joy! &#x1F389;',
    // 🎈
    listIconHtml: '&#x1F388;',
  },
  [EVENT_TYPES.WORK_ANNIVERSARY]: {
    // 🏆
    emojiHtml: '&#x1F3C6;',
    headerBg: 'linear-gradient(135deg, #4776e6 0%, #8e54e9 100%)',
    accentColor: '#4776e6',
    badgeBg: '#f0f4ff',
    badgeText: '#1d3db0',
    headerTitle: 'Happy Work Anniversary!',
    headerSubtitle: 'Thank you for your dedication and hard work! &#x1F31F;',
    // ⭐
    listIconHtml: '&#x2B50;',
  },
  [EVENT_TYPES.MARRIAGE_ANNIVERSARY]: {
    // 💍
    emojiHtml: '&#x1F48D;',
    headerBg: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)',
    accentColor: '#e67e00',
    badgeBg: '#fffbf0',
    badgeText: '#a05800',
    headerTitle: 'Happy Marriage Anniversary!',
    headerSubtitle: 'Celebrating love and togetherness! &#x1F49B;',
    // 💫
    listIconHtml: '&#x1F4AB;',
  },
};

let isCelebrationJobRunning = false;
const sentCelebrationKeysByDate = new Map();

const getZonedDateParts = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const mapped = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    year: Number(mapped.year),
    month: Number(mapped.month),
    day: Number(mapped.day),
  };
};

const toDateOnlyInTimeZone = (date, timeZone) => {
  const p = getZonedDateParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
};

const fullName = (employee) =>
  [employee?.firstName, employee?.lastName].map((v) => String(v || '').trim()).filter(Boolean).join(' ') || `Staff-${employee?.staffId || ''}`;

const pickRecipientEmail = (employee) => {
  const official = String(employee?.officialEmail || '').trim();
  if (official) return official;
  const personal = String(employee?.personalEmail || '').trim();
  if (personal) return personal;
  return null;
};

const toOrdinal = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return `${n}`;
  const abs = Math.abs(num);
  const remainder100 = abs % 100;
  if (remainder100 >= 11 && remainder100 <= 13) return `${num}th`;
  const remainder10 = abs % 10;
  if (remainder10 === 1) return `${num}st`;
  if (remainder10 === 2) return `${num}nd`;
  if (remainder10 === 3) return `${num}rd`;
  return `${num}th`;
};

const parseDateValue = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const yearsSince = (dateValue, nowYear) => {
  const d = parseDateValue(dateValue);
  if (!d) return null;
  return nowYear - d.getFullYear();
};

const isSameMonthDay = (dateValue, month, day) => {
  const d = parseDateValue(dateValue);
  if (!d) return false;
  return d.getMonth() + 1 === month && d.getDate() === day;
};

const buildMilestoneRows = ({ eventType, members, recipientId, includeRecipient = false }) => {
  const config = EVENT_CONFIG[eventType];
  const theme = EVENT_THEME[eventType];
  return members
    .filter((member) => includeRecipient || member.employeeId !== recipientId)
    .map(
      (member) => `
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#444;">
            ${theme.listIconHtml}&nbsp; ${config.listLine(member.name, member.years)}
          </td>
        </tr>`
    )
    .join('');
};

export const buildCelebrationEmail = ({ eventType, recipientName, recipientYears, members, recipientId, dateOnly }) => {
  const config = EVENT_CONFIG[eventType];
  const theme = EVENT_THEME[eventType];
  const isRecipientCelebrant = members.some((m) => m.employeeId === recipientId);
  const listedMembers = members.filter((m) => isRecipientCelebrant ? m.employeeId !== recipientId : true);
  const listedRows = buildMilestoneRows({
    eventType,
    members,
    recipientId,
    includeRecipient: !isRecipientCelebrant,
  });
  const listedCount = listedMembers.length;

  const infoLine = isRecipientCelebrant
    ? config.personalLine(recipientYears)
    : `These employees are celebrating ${config.label.toLowerCase()} today.`;

  const listHeading = isRecipientCelebrant ? 'Also celebrating today' : `${config.label} celebrations today`;
  const subject = isRecipientCelebrant ? config.subject(recipientName) : `${config.label} Celebrations Today`;

  const othersSection = listedCount > 0
    ? `
      <p style="margin:20px 0 8px;font-size:13px;font-weight:600;color:#777;text-transform:uppercase;letter-spacing:0.6px;">
        ${listHeading}
      </p>
      <table width="100%" cellspacing="0" cellpadding="0" style="background:${theme.badgeBg};border-radius:8px;overflow:hidden;border:1px solid #e8e8e8;">
        <tbody>${listedRows}</tbody>
      </table>`
    : `
      <div style="margin:20px 0;padding:14px 18px;background:${theme.badgeBg};border-left:4px solid ${theme.accentColor};border-radius:6px;font-size:14px;color:${theme.badgeText};">
        You are the only one celebrating ${config.label} today &mdash; making it extra special! ${theme.emojiHtml}
      </div>`;

  const headerSection = isRecipientCelebrant
    ? `
        <tr>
          <td style="background:${theme.headerBg};padding:40px 36px;text-align:center;">
            <div style="font-size:52px;line-height:1;margin-bottom:12px;">${theme.emojiHtml}</div>
            <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#ffffff;">${theme.headerTitle}</h1>
            <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.88);">${theme.headerSubtitle}</p>
          </td>
        </tr>`
    : '';

  const introSection = isRecipientCelebrant
    ? `
            <div style="padding:16px 20px;background:${theme.badgeBg};border-radius:8px;border:1px solid ${theme.accentColor}33;margin-bottom:20px;">
              <p style="margin:0;font-size:15px;color:${theme.badgeText};font-weight:500;">
                ${theme.emojiHtml}&nbsp; ${infoLine}
              </p>
            </div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f6fb;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        ${headerSection}

        <!-- Body -->
        <tr>
          <td style="padding:32px 36px 28px;">
            <p style="margin:0 0 16px;font-size:16px;color:#222;">Dear <strong>${recipientName}</strong>,</p>
            ${introSection}
            ${othersSection}
            <p style="margin:28px 0 0;font-size:13px;color:#aaa;border-top:1px solid #f0f0f0;padding-top:16px;">
              &#x1F4C5; Date: <strong style="color:#555;">${dateOnly}</strong>
            </p>
          </td>
        </tr>

        <!-- Sign-off -->
        <tr>
          <td style="padding:0 36px 32px;">
            <p style="margin:0;font-size:14px;color:#555;">
              Warm regards,<br />
              <strong style="color:#333;">HR Team</strong>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f9;border-top:1px solid #f0f0f0;padding:16px 36px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#bbb;">This is an automated message from your HR system. Please do not reply directly to this email.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const textOthers = members
    .filter((m) => isRecipientCelebrant ? m.employeeId !== recipientId : true)
    .map((member) => `- ${config.listLine(member.name, member.years)}`)
    .join('\n');

  const text = [
    `Dear ${recipientName},`,
    infoLine,
    listedCount > 0 ? `${listHeading}:\n${textOthers}` : `You are the only one celebrating ${config.label} today.`,
    `Date: ${dateOnly}`,
    'Regards,',
    'HR Team',
  ].join('\n\n');

  return {
    subject,
    html,
    text,
  };
};

const getCelebrantsForToday = async ({ now = new Date(), timeZone }) => {
  const { year, month, day } = getZonedDateParts(now, timeZone);
  const dateOnly = toDateOnlyInTimeZone(now, timeZone);

  const activeEmployees = await Employee.findAll({
    where: {
      status: 'Active',
      employmentStatus: 'Active',
    },
    attributes: [
      'staffId',
      'firstName',
      'lastName',
      'officialEmail',
      'personalEmail',
      'dateOfBirth',
      'dateOfJoining',
      'weddingDate',
    ],
    order: [['staffId', 'ASC']],
  });

  const groups = {
    [EVENT_TYPES.BIRTHDAY]: [],
    [EVENT_TYPES.WORK_ANNIVERSARY]: [],
    [EVENT_TYPES.MARRIAGE_ANNIVERSARY]: [],
  };
  const recipients = [];

  for (const employee of activeEmployees) {
    const name = fullName(employee);
    const recipientEmail = pickRecipientEmail(employee);
    recipients.push({ employeeId: employee.staffId, name, recipientEmail });

    if (isSameMonthDay(employee.dateOfBirth, month, day)) {
      const age = yearsSince(employee.dateOfBirth, year);
      if (age && age > 0) {
        groups[EVENT_TYPES.BIRTHDAY].push({ employeeId: employee.staffId, name, years: age, recipientEmail });
      }
    }

    if (isSameMonthDay(employee.dateOfJoining, month, day)) {
      const yearsOfService = yearsSince(employee.dateOfJoining, year);
      if (yearsOfService && yearsOfService > 0) {
        groups[EVENT_TYPES.WORK_ANNIVERSARY].push({ employeeId: employee.staffId, name, years: yearsOfService, recipientEmail });
      }
    }

    if (isSameMonthDay(employee.weddingDate, month, day)) {
      const yearsOfMarriage = yearsSince(employee.weddingDate, year);
      if (yearsOfMarriage && yearsOfMarriage > 0) {
        groups[EVENT_TYPES.MARRIAGE_ANNIVERSARY].push({ employeeId: employee.staffId, name, years: yearsOfMarriage, recipientEmail });
      }
    }
  }

  return { dateOnly, groups, recipients };
};

const cleanupOldDedupState = (currentDateOnly) => {
  for (const dateKey of sentCelebrationKeysByDate.keys()) {
    if (dateKey !== currentDateOnly) {
      sentCelebrationKeysByDate.delete(dateKey);
    }
  }
};

const getDedupKey = (eventType, employeeId) => `${eventType}::${employeeId}`;

const wasAlreadySentToday = ({ dateOnly, eventType, employeeId }) => {
  const keys = sentCelebrationKeysByDate.get(dateOnly);
  if (!keys) return false;
  return keys.has(getDedupKey(eventType, employeeId));
};

const markAsSentToday = ({ dateOnly, eventType, employeeId }) => {
  let keys = sentCelebrationKeysByDate.get(dateOnly);
  if (!keys) {
    keys = new Set();
    sentCelebrationKeysByDate.set(dateOnly, keys);
  }
  keys.add(getDedupKey(eventType, employeeId));
};

const sendForGroup = async ({ dateOnly, eventType, members, recipients }) => {
  if (!members || members.length === 0) {
    return { eventType, groupSize: 0, attempted: 0, sent: 0, skippedNoEmail: 0, skippedDedup: 0, failed: 0 };
  }

  let attempted = 0;
  let sent = 0;
  let skippedNoEmail = 0;
  let skippedDedup = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const celebrant = members.find((member) => member.employeeId === recipient.employeeId) || null;

    if (!recipient.recipientEmail) { skippedNoEmail += 1; continue; }
    if (wasAlreadySentToday({ dateOnly, eventType, employeeId: recipient.employeeId })) { skippedDedup += 1; continue; }

    attempted += 1;
    try {
      const mail = buildCelebrationEmail({
        eventType,
        recipientName: recipient.name,
        recipientYears: celebrant?.years ?? null,
        members,
        recipientId: recipient.employeeId,
        dateOnly,
      });

      await sendMail({ to: recipient.recipientEmail, subject: mail.subject, html: mail.html, text: mail.text });
      markAsSentToday({ dateOnly, eventType, employeeId: recipient.employeeId });
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error(`${JOB_PREFIX} failed event=${eventType} employeeId=${recipient.employeeId} email=${recipient.recipientEmail}: ${error.message}`);
    }
  }

  return { eventType, groupSize: members.length, attempted, sent, skippedNoEmail, skippedDedup, failed };
};

export const sendCelebrationMails = async ({
  now = new Date(),
  timeZone = process.env.CELEBRATION_MAIL_TIMEZONE || 'Asia/Kolkata',
} = {}) => {
  const { dateOnly, groups, recipients } = await getCelebrantsForToday({ now, timeZone });
  cleanupOldDedupState(dateOnly);

  const birthday = await sendForGroup({ dateOnly, eventType: EVENT_TYPES.BIRTHDAY, members: groups[EVENT_TYPES.BIRTHDAY], recipients });
  const workAnniversary = await sendForGroup({ dateOnly, eventType: EVENT_TYPES.WORK_ANNIVERSARY, members: groups[EVENT_TYPES.WORK_ANNIVERSARY], recipients });
  const marriageAnniversary = await sendForGroup({ dateOnly, eventType: EVENT_TYPES.MARRIAGE_ANNIVERSARY, members: groups[EVENT_TYPES.MARRIAGE_ANNIVERSARY], recipients });

  const output = { date: dateOnly, groups: { birthday, workAnniversary, marriageAnniversary } };
  console.log(`${JOB_PREFIX} completed`, output);
  return output;
};

export const startCelebrationMailScheduler = () => {
  const cronExpression = process.env.CELEBRATION_MAIL_CRON_EXPRESSION || '0 0 * * *';
  const timezone = process.env.CELEBRATION_MAIL_TIMEZONE || 'Asia/Kolkata';

  cron.schedule(
    cronExpression,
    async () => {
      if (isCelebrationJobRunning) { console.warn(`${JOB_PREFIX} previous run still active, skipping`); return; }
      isCelebrationJobRunning = true;
      try {
        await sendCelebrationMails({ now: new Date(), timeZone: timezone });
      } catch (error) {
        console.error(`${JOB_PREFIX} scheduler run failed: ${error.message}`);
      } finally {
        isCelebrationJobRunning = false;
      }
    },
    { timezone }
  );

  console.log(`${JOB_PREFIX} scheduled with "${cronExpression}" (${timezone})`);
};

export const generateExampleCelebrationEmailOutput = () =>
  `<p>Dear John Doe,</p>
<p>You are celebrating your 5th work anniversary today.</p>
<p>Also celebrating Work Anniversary today:</p>
<ul>
  <li>Jane Smith (3 years of service)</li>
  <li>Alex Kumar (8 years of service)</li>
</ul>
<p>Date: 2026-03-03</p>
<p>Regards,<br/>HR Team</p>`;

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const dotenv = await import('dotenv');
  dotenv.default.config();

  sendCelebrationMails({ now: new Date(), timeZone: process.env.CELEBRATION_MAIL_TIMEZONE || 'Asia/Kolkata' })
    .then((result) => { console.log('[celebration-mail:run-once] success', result); process.exit(0); })
    .catch((error) => { console.error('[celebration-mail:run-once] failed', error); process.exit(1); });
}

export default sendCelebrationMails;
