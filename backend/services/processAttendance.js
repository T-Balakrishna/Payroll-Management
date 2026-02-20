import cron from "node-cron";
import { Op } from "sequelize";
import db from "../models/index.js";

const { Attendance, Employee, ShiftAssignment, ShiftType, Holiday, LeaveRequest, BiometricPunch } = db;

const WEEKLY_OFF_DAY_INDEX = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const toDateOnly = (value = new Date()) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
    return [...new Set(parsed.map((d) => String(d || "").trim().toLowerCase()))].filter(
      (d) => Object.prototype.hasOwnProperty.call(WEEKLY_OFF_DAY_INDEX, d)
    );
  }

  if (typeof parsed === "object" && parsed) {
    return Object.keys(WEEKLY_OFF_DAY_INDEX).filter((d) => Boolean(parsed[d]));
  }

  return [];
};

const isDateWeeklyOffByShift = (dateOnly, weeklyOffDays) => {
  if (!weeklyOffDays || weeklyOffDays.length === 0) return false;
  const dt = new Date(`${dateOnly}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return false;
  const dayIndex = dt.getDay();
  return weeklyOffDays.some((d) => WEEKLY_OFF_DAY_INDEX[d] === dayIndex);
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

const isAssignmentApplicable = (assignment, dateOnly) => {
  if (!assignment || assignment.status !== "Active") return false;

  if (assignment.startDate && dateOnly < assignment.startDate) return false;
  if (assignment.endDate && dateOnly > assignment.endDate) return false;

  if (!assignment.isRecurring) return true;

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

  return true;
};

let isAttendanceJobRunning = false;

export const processAttendanceForDate = async (targetDate = new Date()) => {
  const dateOnly = toDateOnly(targetDate);
  if (!dateOnly) throw new Error("Invalid date for attendance processing");

  const employees = await Employee.findAll({
    where: {
      status: "Active",
      employmentStatus: "Active",
    },
    attributes: ["staffId", "companyId", "shiftTypeId", "status", "employmentStatus"],
  });

  if (employees.length === 0) {
    return { message: "No active employees to process", date: dateOnly, processed: 0, created: 0, updated: 0 };
  }

  const staffIds = employees.map((e) => e.staffId);
  const companyIds = [...new Set(employees.map((e) => e.companyId).filter(Boolean))];

  const [assignments, shiftTypes, holidays, leaves, punches, existingAttendances] = await Promise.all([
    ShiftAssignment.findAll({
      where: {
        staffId: { [Op.in]: staffIds },
        status: "Active",
      },
    }),
    ShiftType.findAll({
      where: { status: "Active" },
    }),
    Holiday.findAll({
      where: {
        companyId: { [Op.in]: companyIds },
        holidayDate: dateOnly,
        status: "Active",
      },
    }),
    LeaveRequest.findAll({
      where: {
        staffId: { [Op.in]: staffIds },
        status: "Approved",
        startDate: { [Op.lte]: dateOnly },
        endDate: { [Op.gte]: dateOnly },
      },
      attributes: ["leaveRequestId", "staffId"],
    }),
    BiometricPunch.findAll({
      where: {
        staffId: { [Op.in]: staffIds },
        punchDate: dateOnly,
        status: { [Op.ne]: "Invalid" },
      },
      order: [["punchTimestamp", "ASC"]],
    }),
    Attendance.findAll({
      where: {
        staffId: { [Op.in]: staffIds },
        attendanceDate: dateOnly,
      },
    }),
  ]);

  const assignmentsByStaff = new Map();
  for (const a of assignments) {
    const key = String(a.staffId);
    if (!assignmentsByStaff.has(key)) assignmentsByStaff.set(key, []);
    assignmentsByStaff.get(key).push(a);
  }

  const shiftTypeMap = new Map(shiftTypes.map((s) => [String(s.shiftTypeId), s]));
  const holidayByCompany = new Map();
  for (const h of holidays) {
    const key = String(h.companyId);
    if (!holidayByCompany.has(key)) holidayByCompany.set(key, []);
    holidayByCompany.get(key).push(h);
  }

  const leaveByStaff = new Map(leaves.map((l) => [String(l.staffId), l]));

  const punchesByStaff = new Map();
  for (const p of punches) {
    const key = String(p.staffId);
    if (!punchesByStaff.has(key)) punchesByStaff.set(key, []);
    punchesByStaff.get(key).push(p);
  }

  const existingByStaff = new Map(existingAttendances.map((a) => [String(a.staffId), a]));

  let processed = 0;
  let created = 0;
  let updated = 0;

  for (const emp of employees) {
    const empKey = String(emp.staffId);
    const companyHolidayRows = holidayByCompany.get(String(emp.companyId)) || [];
    const companyHoliday = companyHolidayRows.find((h) => h.type !== "Week Off");

    const staffAssignments = assignmentsByStaff.get(empKey) || [];
    const selectedAssignment =
      staffAssignments
        .filter((a) => isAssignmentApplicable(a, dateOnly))
        .sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt || 0).getTime() -
            new Date(a.updatedAt || a.createdAt || 0).getTime()
        )[0] || null;

    const shiftTypeId = selectedAssignment?.shiftTypeId || emp.shiftTypeId || null;
    const shiftType = shiftTypeMap.get(String(shiftTypeId || "")) || null;

    const dayPunches = punchesByStaff.get(empKey) || [];
    const firstPunch = dayPunches[0] || null;
    const lastPunch = dayPunches.length > 0 ? dayPunches[dayPunches.length - 1] : null;
    const firstCheckIn = firstPunch?.punchTimestamp ? new Date(firstPunch.punchTimestamp) : null;
    const lastCheckOut = lastPunch?.punchTimestamp ? new Date(lastPunch.punchTimestamp) : null;

    const weeklyOffDays = normalizeWeeklyOffDays(shiftType?.weeklyOff);
    const isShiftWeeklyOff = isDateWeeklyOffByShift(dateOnly, weeklyOffDays);
    const hasApprovedLeave = leaveByStaff.has(empKey);

    const scheduledStart = shiftType ? combineDateTime(dateOnly, shiftType.startTime) : null;
    let scheduledEnd = shiftType ? combineDateTime(dateOnly, shiftType.endTime) : null;
    if (scheduledStart && scheduledEnd && scheduledEnd <= scheduledStart) {
      scheduledEnd = new Date(scheduledEnd.getTime() + 24 * 60 * 60 * 1000);
    }

    const totalCheckIns = dayPunches.filter((p) => p.punchType === "IN").length;
    const totalCheckOuts = dayPunches.filter((p) => p.punchType === "OUT").length;
    const rawWorkingHours =
      firstCheckIn && lastCheckOut && lastCheckOut > firstCheckIn
        ? diffHours(firstCheckIn, lastCheckOut)
        : 0;
    const workingHours = Number(rawWorkingHours.toFixed(2));

    const scheduledHours = scheduledStart && scheduledEnd ? diffHours(scheduledStart, scheduledEnd) : 0;
    const overtimeHours = Number(Math.max(0, workingHours - scheduledHours).toFixed(2));

    const lateGrace = Number(shiftType?.lateGracePeriod || 0);
    const earlyExitPeriod = Number(shiftType?.earlyExitPeriod || 0);
    const lateThreshold = scheduledStart ? new Date(scheduledStart.getTime() + lateGrace * 60 * 1000) : null;
    const earlyExitThreshold = scheduledEnd
      ? new Date(scheduledEnd.getTime() - earlyExitPeriod * 60 * 1000)
      : null;

    const isLate = Boolean(lateThreshold && firstCheckIn && firstCheckIn > lateThreshold);
    const lateByMinutes =
      isLate && firstCheckIn && lateThreshold
        ? Math.max(0, Math.round((firstCheckIn.getTime() - lateThreshold.getTime()) / 60000))
        : 0;

    const isEarlyExit = Boolean(earlyExitThreshold && lastCheckOut && lastCheckOut < earlyExitThreshold);
    const earlyExitMinutes =
      isEarlyExit && lastCheckOut && earlyExitThreshold
        ? Math.max(0, Math.round((earlyExitThreshold.getTime() - lastCheckOut.getTime()) / 60000))
        : 0;

    let attendanceStatus = "Absent";
    let isHoliday = false;
    let isWeekOff = false;
    const remarks = [];

    // 1) Holiday check first
    if (companyHoliday) {
      attendanceStatus = "Holiday";
      isHoliday = true;
      remarks.push(companyHoliday.description || "Company holiday");
    } else if (isShiftWeeklyOff) {
      // 2) Weekly off check from shift weeklyOff constraints
      attendanceStatus = "Week Off";
      isWeekOff = true;
      remarks.push(`Shift weekly off (${weeklyOffDays.join(", ") || "configured"})`);
    } else if (dayPunches.length === 0) {
      // 3) No punch => absent, but approved leave should override
      attendanceStatus = hasApprovedLeave ? "Leave" : "Absent";
      remarks.push(hasApprovedLeave ? "Approved leave request found" : "No punches");
    } else {
      // 4) Shift constraints and punch timings
      const halfDayHours = Number(shiftType?.halfDayHours || 4);
      const presentThreshold = Number(shiftType?.absentHours || 6);

      if (workingHours < halfDayHours) attendanceStatus = "Absent";
      else if (workingHours < presentThreshold) attendanceStatus = "Half-Day";
      else if (isLate) attendanceStatus = "Late";
      else if (isEarlyExit) attendanceStatus = "Early Exit";
      else attendanceStatus = "Present";
    }

    const payload = {
      staffId: emp.staffId,
      companyId: emp.companyId,
      shiftAssignmentId: selectedAssignment?.shiftAssignmentId || null,
      shiftTypeId: shiftType?.shiftTypeId || null,
      attendanceDate: dateOnly,
      scheduledStartTime: shiftType?.startTime || null,
      scheduledEndTime: shiftType?.endTime || null,
      firstCheckIn,
      lastCheckOut,
      totalCheckIns,
      totalCheckOuts,
      workingHours,
      breakHours: 0,
      overtimeHours,
      attendanceStatus,
      isLate,
      lateByMinutes,
      isEarlyExit,
      earlyExitMinutes,
      isHoliday,
      isWeekOff,
      autoGenerated: true,
      remarks: remarks.join("; "),
    };

    const existing = existingByStaff.get(empKey);
    if (existing) {
      await existing.update(payload);
      updated += 1;
    } else {
      await Attendance.create(payload);
      created += 1;
    }

    processed += 1;
  }

  return {
    date: dateOnly,
    processed,
    created,
    updated,
  };
};

export const startAttendanceScheduler = () => {
  const cronExpression = "0 0 * * *";
  const timezone = "Asia/Kolkata";

  cron.schedule(
    cronExpression,
    async () => {
      if (isAttendanceJobRunning) {
        console.warn("[attendance-cron] Previous run still active, skipping this cycle.");
        return;
      }
      isAttendanceJobRunning = true;
      try {
        const result = await processAttendanceForDate(new Date());
        console.log("[attendance-cron] completed", result);
      } catch (error) {
        console.error("[attendance-cron] failed:", error.message);
      } finally {
        isAttendanceJobRunning = false;
      }
    },
    { timezone }
  );

  console.log(`[attendance-cron] scheduled with "${cronExpression}" (${timezone})`);
};

export default processAttendanceForDate;
