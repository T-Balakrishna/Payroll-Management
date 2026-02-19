import { Op } from "sequelize";
import db from '../models/index.js';

const {
  Attendance,
  Employee,
  ShiftAssignment,
  ShiftType,
  Holiday,
  HolidayPlan,
  BiometricPunch,
  Company,
  BiometricDevice,
} = db;
const toDateOnly = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const combineDateTime = (dateOnly, timeValue) => {
  if (!dateOnly || !timeValue) return null;
  const time = String(timeValue).slice(0, 8);
  const dt = new Date(`${dateOnly}T${time}`);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const diffHours = (a, b) => {
  if (!a || !b) return 0;
  return Math.max(0, (b.getTime() - a.getTime()) / (1000 * 60 * 60));
};

const normalizeRecurringDays = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const WEEKLY_OFF_DAY_INDEX = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const normalizeWeeklyOffDays = (value) => {
  if (!value) return [];

  let parsed = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = [];
    }
  }

  if (Array.isArray(parsed)) {
    return [...new Set(
      parsed
        .map((day) => String(day || "").trim().toLowerCase())
        .filter((day) => Object.prototype.hasOwnProperty.call(WEEKLY_OFF_DAY_INDEX, day))
    )];
  }

  if (typeof parsed === "object" && parsed) {
    return Object.keys(WEEKLY_OFF_DAY_INDEX).filter((day) => Boolean(parsed[day]));
  }

  return [];
};

const isDateWeeklyOffByShift = (dateOnly, weeklyOffDays) => {
  const dt = new Date(`${dateOnly}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return false;
  const dayIndex = dt.getDay();
  return weeklyOffDays.some((day) => WEEKLY_OFF_DAY_INDEX[day] === dayIndex);
};

const getMonthBounds = (dateOnly) => {
  const d = new Date(`${dateOnly}T00:00:00`);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { start: toDateOnly(start), end: toDateOnly(end), key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` };
};

const parsePermissionUsedHours = (remarks) => {
  if (!remarks) return 0;
  const match = String(remarks).match(/permUsedHours=([0-9]+(?:\.[0-9]+)?)/i);
  return match ? Number(match[1]) : 0;
};

const parseMonthArg = (monthValue) => {
  if (!monthValue) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  const match = String(monthValue).match(/^(\d{4})-(\d{2})$/);
  if (!match) throw new Error("month must be in YYYY-MM format");
  return { year: Number(match[1]), month: Number(match[2]) };
};

const monthRange = (monthValue) => {
  const { year, month } = parseMonthArg(monthValue);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { start: toDateOnly(start), end: toDateOnly(end), year, month };
};

const ensureShiftTypeForSeed = async (companyId) => {
  let shift = await ShiftType.findOne({
    where: { companyId, name: "General Shift Seed" },
  });
  if (!shift) {
    shift = await ShiftType.create({
      name: "General Shift Seed",
      startTime: "09:00:00",
      endTime: "17:00:00",
      lateGracePeriod: 15,
      earlyExitPeriod: 15,
      halfDayHours: 4,
      absentHours: 6,
      weeklyOff: ["sunday"],
      companyId,
      status: "Active",
    });
  }
  return shift;
};

const ensureHolidayPlanForSeed = async (companyId, startDate, endDate) => {
  let plan = await HolidayPlan.findOne({
    where: { companyId, holidayPlanName: `Seed Plan ${startDate.slice(0, 7)}` },
  });
  if (!plan) {
    plan = await HolidayPlan.create({
      holidayPlanName: `Seed Plan ${startDate.slice(0, 7)}`,
      startDate,
      endDate,
      weeklyOff: { sunday: true, saturday: false },
      companyId,
      status: "Active",
    });
  }
  return plan;
};

const ensureDeviceForSeed = async (companyId) => {
  let device = await BiometricDevice.findOne({
    where: { companyId, deviceIp: "10.10.10.10" },
  });
  if (!device) {
    device = await BiometricDevice.create({
      name: "Main Gate Seed Device",
      deviceIp: "10.10.10.10",
      location: "Main Gate",
      status: "Active",
      isAutoSyncEnabled: true,
      companyId,
    });
  }
  return device;
};

const seedOneMonthPunchesForTest = async ({ month, companyId, staffId }) => {
  const range = monthRange(month);

  const employee = staffId
    ? await Employee.findByPk(staffId)
    : await Employee.findOne({
        where: companyId ? { companyId } : {},
        order: [["staffId", "ASC"]],
      });

  if (!employee) throw new Error("No staff found for seed");
  const effectiveCompanyId = companyId || employee.companyId;

  const company = await Company.findByPk(effectiveCompanyId);
  if (!company) throw new Error("Company not found for seed");

  const shiftType = await ensureShiftTypeForSeed(company.companyId);
  const holidayPlan = await ensureHolidayPlanForSeed(company.companyId, range.start, range.end);
  const device = await ensureDeviceForSeed(company.companyId);

  const holidayDate = toDateOnly(new Date(range.year, range.month - 1, 15));
  const existingHoliday = await Holiday.findOne({
    where: { companyId: company.companyId, holidayPlanId: holidayPlan.holidayPlanId, holidayDate },
  });
  if (!existingHoliday) {
    await Holiday.create({
      holidayDate,
      description: "Seed Festival Holiday",
      type: "Holiday",
      holidayPlanId: holidayPlan.holidayPlanId,
      companyId: company.companyId,
      status: "Active",
    });
  }

  if (!employee.shiftTypeId) {
    await employee.update({ shiftTypeId: shiftType.shiftTypeId });
  }
  if (!employee.biometricNumber) {
    await employee.update({ biometricNumber: `BIO${employee.staffId}` });
  }
  if (!employee.remainingPermissionHours || Number(employee.remainingPermissionHours) === 0) {
    await employee.update({ remainingPermissionHours: Number(company.permissionHoursPerMonth || 0) });
  }

  await BiometricPunch.destroy({
    where: {
      staffId: employee.staffId,
      punchDate: { [Op.between]: [range.start, range.end] },
    },
    force: true,
  });

  const atTime = (dateOnly, hhmmss) => new Date(`${dateOnly}T${hhmmss}`);
  let insertedPunchRows = 0;

  for (
    let d = new Date(`${range.start}T00:00:00`);
    d <= new Date(`${range.end}T00:00:00`);
    d.setDate(d.getDate() + 1)
  ) {
    const dateOnly = toDateOnly(d);
    const dow = d.getDay();
    const day = d.getDate();
    const weeklyOffDays = normalizeWeeklyOffDays(shiftType?.weeklyOff);
    const weeklyOffIndexes = new Set(
      weeklyOffDays.map((name) => WEEKLY_OFF_DAY_INDEX[name]).filter((i) => Number.isInteger(i))
    );

    if (weeklyOffIndexes.has(dow) || dateOnly === holidayDate) continue; // weekly off + holiday
    const pattern = day % 5;
    if (pattern === 0) continue; // absent day

    let inTime = "09:00:00";
    let outTime = "17:00:00";
    if (pattern === 1) {
      inTime = "08:58:00";
      outTime = "17:05:00";
    } else if (pattern === 2) {
      inTime = "09:22:00";
      outTime = "17:10:00";
    } else if (pattern === 3) {
      inTime = "09:05:00";
      outTime = "14:55:00"; // permission-eligible short day
    } else if (pattern === 4) {
      inTime = "09:12:00";
      outTime = "12:45:00"; // half-day candidate
    }

    await BiometricPunch.create({
      staffId: employee.staffId,
      biometricDeviceId: device.deviceId,
      biometricNumber: employee.biometricNumber,
      punchTimestamp: atTime(dateOnly, inTime),
      punchDate: dateOnly,
      punchType: "IN",
      isManual: false,
      status: "Valid",
      companyId: company.companyId,
    });
    await BiometricPunch.create({
      staffId: employee.staffId,
      biometricDeviceId: device.deviceId,
      biometricNumber: employee.biometricNumber,
      punchTimestamp: atTime(dateOnly, outTime),
      punchDate: dateOnly,
      punchType: "OUT",
      isManual: false,
      status: "Valid",
      companyId: company.companyId,
    });
    insertedPunchRows += 2;
  }

  return {
    companyId: company.companyId,
    staffId: employee.staffId,
    monthStart: range.start,
    monthEnd: range.end,
    insertedPunchRows,
  };
};

const buildAttendanceSummary = async ({ companyId, staffId, dateFrom, dateTo }) => {
  const where = {
    companyId,
    attendanceDate: { [Op.between]: [dateFrom, dateTo] },
    ...(staffId ? { staffId } : {}),
  };
  const rows = await Attendance.findAll({
    where,
    order: [["attendanceDate", "ASC"]],
  });

  const statusSummary = {};
  let permissionConsumedHours = 0;
  for (const r of rows) {
    statusSummary[r.attendanceStatus] = (statusSummary[r.attendanceStatus] || 0) + 1;
    permissionConsumedHours += parsePermissionUsedHours(r.remarks);
  }

  return {
    attendanceRows: rows.length,
    statusSummary,
    permissionConsumedHours: Number(permissionConsumedHours.toFixed(2)),
    preview: rows.slice(0, 10).map((r) => ({
      date: r.attendanceDate,
      status: r.attendanceStatus,
      workingHours: r.workingHours,
      late: r.isLate,
      earlyExit: r.isEarlyExit,
      remarks: r.remarks,
    })),
  };
};

const isAssignmentApplicable = (assignment, dateOnly) => {
  if (!assignment || assignment.status !== "Active") return false;
  if (!assignment.isRecurring) {
    if (assignment.startDate && dateOnly < assignment.startDate) return false;
    if (assignment.endDate && dateOnly > assignment.endDate) return false;
    return true;
  }

  if (assignment.startDate && dateOnly < assignment.startDate) return false;
  if (assignment.endDate && dateOnly > assignment.endDate) return false;

  const recurringPattern = assignment.recurringPattern;
  if (!recurringPattern) return false;

  if (recurringPattern === "daily") return true;

  const date = new Date(`${dateOnly}T00:00:00`);
  if (recurringPattern === "weekly") {
    const days = normalizeRecurringDays(assignment.recurringDays);
    return days.includes(date.getDay());
  }

  if (recurringPattern === "monthly") {
    if (assignment.startDate) {
      const base = new Date(`${assignment.startDate}T00:00:00`);
      return base.getDate() === date.getDate();
    }
    return true;
  }

  // "custom" fallback
  return true;
};

const decideAttendanceStatus = ({
  isHoliday,
  isWeekOff,
  workingHours,
  shiftType,
  isLate,
  isEarlyExit,
  hasPunches,
}) => {
  if (isHoliday) return "Holiday";
  if (isWeekOff) return "Week Off";
  if (!hasPunches) return "Absent";

  const halfDayHours = Number(shiftType?.halfDayHours || 4);
  const presentThreshold = Number(shiftType?.absentHours || 6);

  let baseStatus = "Present";
  if (workingHours < halfDayHours) baseStatus = "Absent";
  else if (workingHours < presentThreshold) baseStatus = "Half-Day";

  if (baseStatus === "Present" && isLate) return "Late";
  if (baseStatus === "Present" && isEarlyExit) return "Early Exit";
  return baseStatus;
};

// Get all attendances (usually filtered by company or date range in real use)
export const getAllAttendances = async (req, res) => {
  try {
    const attendances = await Attendance.findAll({
      include: [
        { model: db.Employee, as: 'employee' },
        { model: db.Company,   as: 'company' },
        { model: db.ShiftType, as: 'shiftType' },
        { model: db.ShiftAssignment, as: 'shiftAssignment' },
        { model: db.User, as: 'approver' },
        
      ]
    });
    res.json(attendances);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get attendance by ID
export const getAttendanceById = async (req, res) => {
  try {
    const attendance = await Attendance.findByPk(req.params.id, {
      include: [
        { model: db.Employee, as: 'employee' },
        { model: db.Company,   as: 'company' },
        { model: db.ShiftType, as: 'shiftType' },
        { model: db.ShiftAssignment, as: 'shiftAssignment' },
        { model: db.User, as: 'approver' },
        
      ]
    });

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new attendance record
export const createAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.create(req.body);
    res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update attendance
export const updateAttendance = async (req, res) => {
  try {
    const [updated] = await Attendance.update(req.body, {
      where: { attendanceId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    const attendance = await Attendance.findByPk(req.params.id);
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete attendance (soft delete supported via paranoid: true)
export const deleteAttendance = async (req, res) => {
  try {
    const deleted = await Attendance.destroy({
      where: { attendanceId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    res.json({ message: 'Attendance record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Process attendance from biometric punches and compute working hours.
// POST /api/attendances/process-punches
// body: { companyId, dateFrom, dateTo, staffId?, includeAbsent? }
export const processPunchesToAttendance = async (req, res) => {
  try {
    const companyId = req.body?.companyId ?? req.query?.companyId;
    const staffId = req.body?.staffId ?? req.query?.staffId;
    const includeAbsent = String(req.body?.includeAbsent ?? req.query?.includeAbsent ?? "false").toLowerCase() === "true";

    const dateFrom = toDateOnly(req.body?.dateFrom ?? req.query?.dateFrom) || toDateOnly(new Date());
    const dateTo = toDateOnly(req.body?.dateTo ?? req.query?.dateTo) || dateFrom;

    if (!companyId) {
      return res.status(400).json({ error: "companyId is required" });
    }
    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: "Valid dateFrom/dateTo required" });
    }
    if (dateFrom > dateTo) {
      return res.status(400).json({ error: "dateFrom cannot be greater than dateTo" });
    }

    const company = await Company.findByPk(companyId, {
      attributes: ["companyId", "permissionHoursPerMonth"],
    });

    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    const monthlyPermissionQuota = Number(company.permissionHoursPerMonth || 0);

    const employees = await Employee.findAll({
      where: {
        companyId,
        ...(staffId ? { staffId } : {}),
      },
      attributes: [
        "staffId",
        "companyId",
        "staffNumber",
        "departmentId",
        "employeeGradeId",
        "shiftTypeId",
        "remainingPermissionHours",
        "status",
        "employmentStatus",
      ],
    });

    const activeEmployees = employees.filter(
      (e) => e.status === "Active" || e.employmentStatus === "Active"
    );
    const staffIds = activeEmployees.map((e) => e.staffId);
    if (staffIds.length === 0) {
      return res.json({
        message: "No active staff found for processing",
        processed: 0,
        updated: 0,
        created: 0,
      });
    }

    const [assignments, shiftTypes, holidays, punches] = await Promise.all([
      ShiftAssignment.findAll({
        where: {
          companyId,
          staffId: { [Op.in]: staffIds },
          status: "Active",
        },
      }),
      ShiftType.findAll({
        where: { companyId, status: "Active" },
      }),
      Holiday.findAll({
        where: {
          companyId,
          holidayDate: { [Op.between]: [dateFrom, dateTo] },
          status: "Active",
        },
      }),
      BiometricPunch.findAll({
        where: {
          companyId,
          staffId: { [Op.in]: staffIds },
          punchDate: { [Op.between]: [dateFrom, dateTo] },
          status: { [Op.ne]: "Invalid" },
        },
        order: [["punchTimestamp", "ASC"]],
      }),
    ]);

    const assignmentMap = new Map();
    for (const a of assignments) {
      const key = String(a.staffId);
      if (!assignmentMap.has(key)) assignmentMap.set(key, []);
      assignmentMap.get(key).push(a);
    }

    const shiftTypeMap = new Map(shiftTypes.map((s) => [String(s.shiftTypeId), s]));
    const holidayMap = new Map(holidays.map((h) => [h.holidayDate, h]));

    const punchMap = new Map();
    for (const p of punches) {
      const key = `${p.staffId}::${p.punchDate}`;
      if (!punchMap.has(key)) punchMap.set(key, []);
      punchMap.get(key).push(p);
    }

    const dateList = [];
    for (let dt = new Date(`${dateFrom}T00:00:00`); dt <= new Date(`${dateTo}T00:00:00`); dt.setDate(dt.getDate() + 1)) {
      dateList.push(toDateOnly(dt));
    }

    let created = 0;
    let updated = 0;
    let processed = 0;
    let permissionConsumedHours = 0;
    const monthInitCache = new Set();
    const remainingPermissionMap = new Map(
      activeEmployees.map((e) => [
        String(e.staffId),
        Number(e.remainingPermissionHours ?? monthlyPermissionQuota ?? 0),
      ])
    );

    for (const emp of activeEmployees) {
      const empAssignments = assignmentMap.get(String(emp.staffId)) || [];

      for (const dateOnly of dateList) {
        const month = getMonthBounds(dateOnly);
        const monthCacheKey = `${emp.staffId}::${month.key}`;
        if (!monthInitCache.has(monthCacheKey)) {
          const monthCount = await Attendance.count({
            where: {
              staffId: emp.staffId,
              attendanceDate: { [Op.between]: [month.start, month.end] },
            },
          });

          if (monthCount === 0) {
            const resetTo = Math.max(0, monthlyPermissionQuota);
            remainingPermissionMap.set(String(emp.staffId), resetTo);
            await emp.update({ remainingPermissionHours: resetTo });
          }
          monthInitCache.add(monthCacheKey);
        }

        const punchKey = `${emp.staffId}::${dateOnly}`;
        const dayPunches = punchMap.get(punchKey) || [];

        const selectedAssignment =
          empAssignments
            .filter((a) => isAssignmentApplicable(a, dateOnly))
            .sort(
              (a, b) =>
                new Date(b.updatedAt || b.createdAt || 0).getTime() -
                new Date(a.updatedAt || a.createdAt || 0).getTime()
            )[0] || null;

        const shiftTypeId = selectedAssignment?.shiftTypeId || emp.shiftTypeId;
        const shiftType = shiftTypeMap.get(String(shiftTypeId || "")) || null;

        const scheduledStart = shiftType ? combineDateTime(dateOnly, shiftType.startTime) : null;
        let scheduledEnd = shiftType ? combineDateTime(dateOnly, shiftType.endTime) : null;
        if (scheduledStart && scheduledEnd && scheduledEnd <= scheduledStart) {
          scheduledEnd = new Date(scheduledEnd.getTime() + 24 * 60 * 60 * 1000);
        }

        const holiday = holidayMap.get(dateOnly);
        const isHoliday = Boolean(holiday && holiday.type !== "Week Off");
        const shiftWeeklyOffDays = normalizeWeeklyOffDays(shiftType?.weeklyOff);
        const isShiftWeeklyOff = isDateWeeklyOffByShift(dateOnly, shiftWeeklyOffDays);
        const isWeekOff = Boolean(holiday?.type === "Week Off" || isShiftWeeklyOff);
        if (!includeAbsent && dayPunches.length === 0 && !isHoliday && !isWeekOff) continue;

        const firstPunch = dayPunches[0] || null;
        const lastPunch = dayPunches.length > 0 ? dayPunches[dayPunches.length - 1] : null;
        const firstCheckIn = firstPunch?.punchTimestamp ? new Date(firstPunch.punchTimestamp) : null;
        const lastCheckOut = lastPunch?.punchTimestamp ? new Date(lastPunch.punchTimestamp) : null;

        const totalCheckIns = dayPunches.filter((p) => p.punchType === "IN").length;
        const totalCheckOuts = dayPunches.filter((p) => p.punchType === "OUT").length;

        const rawWorkingHours =
          firstCheckIn && lastCheckOut && lastCheckOut > firstCheckIn
            ? diffHours(firstCheckIn, lastCheckOut)
            : 0;
        const breakHours = 0;
        const workingHours = Math.max(0, rawWorkingHours - breakHours);

        const scheduledHours = scheduledStart && scheduledEnd ? diffHours(scheduledStart, scheduledEnd) : 0;
        const overtimeHours = Math.max(0, workingHours - scheduledHours);

        const lateGrace = Number(shiftType?.lateGracePeriod || 0);
        const earlyExitPeriod = Number(shiftType?.earlyExitPeriod || 0);

        const lateThreshold = scheduledStart
          ? new Date(scheduledStart.getTime() + lateGrace * 60 * 1000)
          : null;
        const isLate = Boolean(lateThreshold && firstCheckIn && firstCheckIn > lateThreshold);
        const lateByMinutes = isLate ? Math.round((firstCheckIn.getTime() - lateThreshold.getTime()) / 60000) : 0;

        const earlyExitThreshold = scheduledEnd
          ? new Date(scheduledEnd.getTime() - earlyExitPeriod * 60 * 1000)
          : null;
        const isEarlyExit = Boolean(
          earlyExitThreshold && lastCheckOut && lastCheckOut < earlyExitThreshold
        );
        const earlyExitMinutes = isEarlyExit
          ? Math.round((earlyExitThreshold.getTime() - lastCheckOut.getTime()) / 60000)
          : 0;

        const halfDayHours = Number(shiftType?.halfDayHours || 4);
        const presentThreshold = Number(shiftType?.absentHours || 6);
        const hasPunches = dayPunches.length > 0;

        const currentRemaining = Number(remainingPermissionMap.get(String(emp.staffId)) || 0);
        const shortfallHours = Math.max(0, presentThreshold - workingHours);
        const permissionEligible = !isHoliday && !isWeekOff && hasPunches && shortfallHours > 0;
        const permissionUsedHours = permissionEligible
          ? Math.min(Math.ceil(shortfallHours), currentRemaining)
          : 0;
        const effectiveWorkingHours = Number((workingHours + permissionUsedHours).toFixed(2));

        let attendanceStatus = decideAttendanceStatus({
          isHoliday,
          isWeekOff,
          workingHours: effectiveWorkingHours,
          shiftType,
          isLate,
          isEarlyExit,
          hasPunches,
        });

        if (!isHoliday && !isWeekOff && permissionUsedHours > 0) {
          if (effectiveWorkingHours >= presentThreshold) {
            attendanceStatus = "Permission";
          } else if (effectiveWorkingHours >= halfDayHours) {
            attendanceStatus = "Half-Day";
          } else {
            attendanceStatus = "Absent";
          }
        }

        const payload = {
          staffId: emp.staffId,
          companyId,
          shiftAssignmentId: selectedAssignment?.shiftAssignmentId || null,
          shiftTypeId: shiftType?.shiftTypeId || null,
          attendanceDate: dateOnly,
          scheduledStartTime: shiftType?.startTime || null,
          scheduledEndTime: shiftType?.endTime || null,
          firstCheckIn: firstCheckIn || null,
          lastCheckOut: lastCheckOut || null,
          totalCheckIns,
          totalCheckOuts,
          workingHours: Number(effectiveWorkingHours.toFixed(2)),
          breakHours: Number(breakHours.toFixed(2)),
          overtimeHours: Number(overtimeHours.toFixed(2)),
          attendanceStatus,
          isLate,
          lateByMinutes,
          isEarlyExit,
          earlyExitMinutes,
          isHoliday,
          isWeekOff,
          autoGenerated: true,
          remarks: `permUsedHours=${permissionUsedHours}; rawWorkingHours=${Number(workingHours.toFixed(2))}`,
          updatedBy: req.body?.updatedBy || null,
        };

        const existing = await Attendance.findOne({
          where: { staffId: emp.staffId, attendanceDate: dateOnly },
        });

        if (existing) {
          const prevPermUsed = parsePermissionUsedHours(existing.remarks);
          const deltaPerm = permissionUsedHours - prevPermUsed;
          const newRemaining = Math.max(
            0,
            Math.round(currentRemaining - deltaPerm)
          );
          remainingPermissionMap.set(String(emp.staffId), newRemaining);
          await emp.update({ remainingPermissionHours: newRemaining });
          permissionConsumedHours += Math.max(0, deltaPerm);

          await existing.update(payload);
          updated += 1;
        } else {
          const newRemaining = Math.max(0, Math.round(currentRemaining - permissionUsedHours));
          remainingPermissionMap.set(String(emp.staffId), newRemaining);
          await emp.update({ remainingPermissionHours: newRemaining });
          permissionConsumedHours += permissionUsedHours;

          await Attendance.create({
            ...payload,
            createdBy: req.body?.createdBy || null,
          });
          created += 1;
        }
        processed += 1;
      }
    }

    return res.json({
      message: "Attendance processed from biometric punches",
      companyId,
      dateFrom,
      dateTo,
      includeAbsent,
      processed,
      created,
      updated,
      permissionConsumedHours: Number(permissionConsumedHours.toFixed(2)),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Test-only helper:
// seeds one month punch logs, processes attendance, and returns summary in one call.
// POST /api/attendances/test/seed-process-verify
// body: { month: "YYYY-MM", companyId?, staffId?, includeAbsent? }
export const seedProcessVerifyAttendanceTest = async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Not allowed in production" });
    }

    const month = req.body?.month || req.query?.month;
    const companyId = req.body?.companyId ?? req.query?.companyId;
    const staffId = req.body?.staffId ?? req.query?.staffId;
    const includeAbsent =
      String(req.body?.includeAbsent ?? req.query?.includeAbsent ?? "true").toLowerCase() ===
      "true";

    const seeded = await seedOneMonthPunchesForTest({ month, companyId, staffId });

    const processResult = await processPunchesToAttendance(
      {
        body: {
          companyId: seeded.companyId,
          staffId: seeded.staffId,
          dateFrom: seeded.monthStart,
          dateTo: seeded.monthEnd,
          includeAbsent,
          createdBy: req.body?.createdBy || null,
          updatedBy: req.body?.updatedBy || null,
        },
        query: {},
      },
      {
        status(code) {
          this._status = code;
          return this;
        },
        json(payload) {
          this._payload = payload;
          return payload;
        },
      }
    );

    const summary = await buildAttendanceSummary({
      companyId: seeded.companyId,
      staffId: seeded.staffId,
      dateFrom: seeded.monthStart,
      dateTo: seeded.monthEnd,
    });

    return res.json({
      message: "Seed + process + verify completed",
      seeded,
      processResult,
      summary,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const fetchMonthAttendance = async (req, res) => {
  try {
    const { month, companyId, staffId } = req.query;

    // Validate month format (YYYY-MM)
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ msg: "month must be in YYYY-MM format" });
    }

    const [year, mon] = month.split("-").map(Number);
    const startDate = `${year}-${String(mon).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(mon).padStart(2, "0")}-${new Date(year, mon, 0).getDate()}`;

    const where = {
      attendanceDate: { [Op.between]: [startDate, endDate] },
    };

    if (companyId) {
      where.companyId = companyId;
    }

    if (staffId) {
      where.staffId = staffId;
    }

    const attendances = await Attendance.findAll({
      where,
      attributes: ["attendanceDate", "attendanceStatus"], // only needed fields
      order: [["attendanceDate", "ASC"]],
      raw: true, // faster, plain objects
    });

    // Format response as simple { "YYYY-MM-DD": "Present", ... }
    const formatted = {};
    attendances.forEach((att) => {
      formatted[att.attendanceDate] = att.attendanceStatus;
    });

    res.json({
      month,
      startDate,
      endDate,
      totalDays: attendances.length,
      data: formatted,
    });
  } catch (err) {
    console.error("Error in fetchMonthAttendance:", err);
    res.status(500).json({ msg: "Failed to fetch monthly attendance" });
  }
};
