import cron from "node-cron";
import { Op } from "sequelize";
import db from "../models/index.js";

const {
  Attendance,
  Employee,
  ShiftAssignment,
  ShiftType,
  Holiday,
  LeaveRequest,
  BiometricPunch,
  Permission,
  LeaveAllocation,
  LeaveType,
  Company,
  sequelize,
} = db;

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

const parseTaggedNumber = (remarks, tag) => {
  if (!remarks) return 0;
  const match = String(remarks).match(new RegExp(`${tag}=([0-9]+(?:\\.[0-9]+)?)`, "i"));
  return match ? Number(match[1]) : 0;
};

const parseTaggedInteger = (remarks, tag) => {
  if (!remarks) return null;
  const match = String(remarks).match(new RegExp(`${tag}=([0-9]+)`, "i"));
  return match ? Number(match[1]) : null;
};

const calculateAvailableFromAllocation = (allocation) => {
  const carried = Number(allocation?.carryForwardFromPrevious || 0);
  const accrued = Number(allocation?.totalAccruedTillDate || 0);
  const used = Number(allocation?.usedLeaves || 0);
  return carried + accrued - used;
};

const getLeaveUnitsForDate = (leaveRequest, dateOnly) => {
  if (!leaveRequest) return 0;
  if (leaveRequest.leaveCategory === "Half Day") return 0.5;
  if (leaveRequest.startDate === leaveRequest.endDate) {
    const singleDayUnits = Number(leaveRequest.totalDays || 1);
    return singleDayUnits > 0 ? singleDayUnits : 1;
  }
  return 1;
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
    attributes: ["staffId", "companyId", "shiftTypeId", "status", "employmentStatus", "remainingPermissionHours"],
  });

  if (employees.length === 0) {
    return { message: "No active employees to process", date: dateOnly, processed: 0, created: 0, updated: 0 };
  }

  const staffIds = employees.map((e) => e.staffId);
  const companyIds = [...new Set(employees.map((e) => e.companyId).filter(Boolean))];

  const [assignments, shiftTypes, holidays, leaves, punches, existingAttendances, companies, leaveAllocations] =
    await Promise.all([
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
      attributes: [
        "leaveRequestId",
        "staffId",
        "companyId",
        "leaveTypeId",
        "leaveAllocationId",
        "leaveCategory",
        "halfDayType",
        "totalDays",
        "startDate",
        "endDate",
        "updatedAt",
      ],
      include: [{ model: LeaveType, as: "leaveType", attributes: ["leaveTypeId", "name", "leaveTypeName"] }],
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
    Company.findAll({
      where: { companyId: { [Op.in]: companyIds } },
      attributes: ["companyId", "permissionHoursPerMonth"],
    }),
    LeaveAllocation.findAll({
      where: {
        staffId: { [Op.in]: staffIds },
        companyId: { [Op.in]: companyIds },
        status: "Active",
        effectiveFrom: { [Op.lte]: dateOnly },
        effectiveTo: { [Op.gte]: dateOnly },
      },
      attributes: [
        "leaveAllocationId",
        "staffId",
        "companyId",
        "leaveTypeId",
        "carryForwardFromPrevious",
        "totalAccruedTillDate",
        "usedLeaves",
        "updatedBy",
      ],
      order: [["effectiveFrom", "DESC"]],
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

  const leaveByStaff = new Map();
  for (const l of leaves.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())) {
    const key = String(l.staffId);
    if (!leaveByStaff.has(key)) leaveByStaff.set(key, l);
  }

  const punchesByStaff = new Map();
  for (const p of punches) {
    const key = String(p.staffId);
    if (!punchesByStaff.has(key)) punchesByStaff.set(key, []);
    punchesByStaff.get(key).push(p);
  }

  const existingByStaff = new Map(existingAttendances.map((a) => [String(a.staffId), a]));
  const companyPermissionMap = new Map(companies.map((c) => [String(c.companyId), Number(c.permissionHoursPerMonth || 0)]));
  const allocationById = new Map(leaveAllocations.map((a) => [String(a.leaveAllocationId), a]));
  const allocationByStaffType = new Map();
  for (const allocation of leaveAllocations) {
    const key = `${allocation.staffId}::${allocation.leaveTypeId}`;
    if (!allocationByStaffType.has(key)) allocationByStaffType.set(key, allocation);
  }

  let processed = 0;
  let created = 0;
  let updated = 0;

  for (const emp of employees) {
    const empKey = String(emp.staffId);
    const existing = existingByStaff.get(empKey) || null;
    const previousPermissionUsed = Number(parseTaggedNumber(existing?.remarks, "permUsedHours").toFixed(2));
    const previousLeaveUsed = Number(parseTaggedNumber(existing?.remarks, "leaveUsedDays").toFixed(2));
    const previousLeaveAllocationId = parseTaggedInteger(existing?.remarks, "leaveAllocationId");

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
    const approvedLeave = leaveByStaff.get(empKey) || null;

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
    const minimumHours = Number(shiftType?.minimumHours || shiftType?.absentHours || 6);
    const halfDayHours = Number(shiftType?.halfDayHours || 4);
    const hasPunches = dayPunches.length > 0;
    const shortfallHours = Math.max(0, Number((minimumHours - workingHours).toFixed(2)));
    const currentPermissionRemaining = Number(
      emp.remainingPermissionHours ?? companyPermissionMap.get(String(emp.companyId)) ?? 0
    );

    let permissionUsedHours = 0;
    let leaveUsedDays = 0;
    let leaveAllocationIdUsed = null;
    let leaveRequestIdUsed = null;

    if (companyHoliday) {
      attendanceStatus = "Holiday";
      isHoliday = true;
      remarks.push(companyHoliday.description || "Company holiday");
    } else if (isShiftWeeklyOff) {
      attendanceStatus = "Week Off";
      isWeekOff = true;
      remarks.push(`Shift weekly off (${weeklyOffDays.join(", ") || "configured"})`);
    } else {
      // ===== UPDATED FLOW (with FN/AN + permission from both sides) =====

      const coversFullShift =
        Boolean(
          hasPunches &&
            scheduledStart &&
            scheduledEnd &&
            firstCheckIn &&
            lastCheckOut &&
            firstCheckIn <= scheduledStart &&
            lastCheckOut >= scheduledEnd
        );

      // helper: decide FN/AN based on which side is more missing
      const getHalfDaySession = () => {
        if (!scheduledStart || !scheduledEnd || !firstCheckIn || !lastCheckOut) return "FN";

        const missingBeforeMin = Math.max(
          0,
          Math.round((firstCheckIn.getTime() - scheduledStart.getTime()) / 60000)
        );
        const missingAfterMin = Math.max(
          0,
          Math.round((scheduledEnd.getTime() - lastCheckOut.getTime()) / 60000)
        );

        // We want which half he is PRESENT:
        // - If morning missing more => present in AN
        // - If evening missing more => present in FN
        return missingBeforeMin >= missingAfterMin ? "AN" : "FN";
      };

      // helper: permission hours from BOTH SIDES (rounded separately)
      const getPermissionHoursBothSides = () => {
        if (!scheduledStart || !scheduledEnd || !firstCheckIn || !lastCheckOut) return 0;

        const lateMin = Math.max(0, Math.round((firstCheckIn.getTime() - scheduledStart.getTime()) / 60000));
        const earlyMin = Math.max(0, Math.round((scheduledEnd.getTime() - lastCheckOut.getTime()) / 60000));

        const lateHours = lateMin > 0 ? Math.ceil(lateMin / 60) : 0;
        const earlyHours = earlyMin > 0 ? Math.ceil(earlyMin / 60) : 0;

        return lateHours + earlyHours;
      };

      if (coversFullShift) {
        attendanceStatus = "Present";
      } else if (hasPunches) {
        // If punches exist but shift not covered

        // If >= minimum hours, try permission (both sides)
        if (workingHours >= minimumHours) {
          const neededPermissionHours = getPermissionHoursBothSides();

          if (neededPermissionHours > 0 && currentPermissionRemaining >= neededPermissionHours) {
            permissionUsedHours = neededPermissionHours;
            attendanceStatus = `Permission-${permissionUsedHours}`;
            remarks.push(`Compensated late/early using permission hours (${permissionUsedHours}h)`);
          } else {
            // Not enough permission -> go leave/absent checks
            if (workingHours >= halfDayHours) {
              if (approvedLeave) {
                // same leave/allocation logic (unchanged)
                const requestedLeaveUnits = Number(getLeaveUnitsForDate(approvedLeave, dateOnly).toFixed(2));

                let targetAllocation = null;

                if (approvedLeave.leaveAllocationId) {
                  targetAllocation = allocationById.get(String(approvedLeave.leaveAllocationId)) || null;
                  if (!targetAllocation) {
                    targetAllocation = await LeaveAllocation.findByPk(approvedLeave.leaveAllocationId);
                    if (targetAllocation) allocationById.set(String(targetAllocation.leaveAllocationId), targetAllocation);
                  }
                }

                if (!targetAllocation && approvedLeave.leaveTypeId) {
                  targetAllocation = allocationByStaffType.get(`${emp.staffId}::${approvedLeave.leaveTypeId}`) || null;
                }

                if (!targetAllocation && approvedLeave.leaveTypeId) {
                  targetAllocation = await LeaveAllocation.findOne({
                    where: {
                      staffId: emp.staffId,
                      companyId: emp.companyId,
                      leaveTypeId: approvedLeave.leaveTypeId,
                      status: "Active",
                      effectiveFrom: { [Op.lte]: dateOnly },
                      effectiveTo: { [Op.gte]: dateOnly },
                    },
                    order: [["effectiveFrom", "DESC"]],
                  });

                  if (targetAllocation) {
                    allocationById.set(String(targetAllocation.leaveAllocationId), targetAllocation);
                    allocationByStaffType.set(`${emp.staffId}::${approvedLeave.leaveTypeId}`, targetAllocation);
                  }
                }

                if (targetAllocation && requestedLeaveUnits > 0) {
                  let available = calculateAvailableFromAllocation(targetAllocation);
                  if (
                    previousLeaveAllocationId &&
                    Number(previousLeaveAllocationId) === Number(targetAllocation.leaveAllocationId)
                  ) {
                    available += previousLeaveUsed;
                  }

                  if (available >= requestedLeaveUnits) {
                    leaveUsedDays = requestedLeaveUnits;
                    leaveAllocationIdUsed = targetAllocation.leaveAllocationId;
                    leaveRequestIdUsed = approvedLeave.leaveRequestId;

                    const leaveName =
                      approvedLeave.leaveType?.name || approvedLeave.leaveType?.leaveTypeName || "Leave";

                    // If it's half-day leave, append FN/AN (use leave halfDayType if present else infer)
                    if (requestedLeaveUnits === 0.5) {
                      const half =
                        approvedLeave.halfDayType
                          ? String(approvedLeave.halfDayType).toUpperCase().includes("AN")
                            ? "AN"
                            : "FN"
                          : getHalfDaySession();
                      attendanceStatus = `Leave - ${leaveName} - Half-day-${half}`;
                    } else {
                      attendanceStatus = `Leave - ${leaveName}`;
                    }
                  } else {
                    // half-day absent case -> mark FN/AN
                    const half = getHalfDaySession();
                    attendanceStatus = `Half-day-${half}`;
                    remarks.push("Approved leave found but insufficient leave balance");
                  }
                } else {
                  const half = getHalfDaySession();
                  attendanceStatus = `Half-day-${half}`;
                  remarks.push("Approved leave found but no active leave allocation");
                }
              } else {
                // No leave -> half-day absent marking
                const half = getHalfDaySession();
                attendanceStatus = `Half-day-${half}`;
                remarks.push("Insufficient permission and no approved leave");
              }
            } else {
              // < half day hours -> full-day leave only else absent
              const leaveUnits = approvedLeave ? Number(getLeaveUnitsForDate(approvedLeave, dateOnly).toFixed(2)) : 0;
              const hasApprovedFullDayLeave = Boolean(approvedLeave) && leaveUnits >= 1;

              if (hasApprovedFullDayLeave) {
                // keep your existing full-day leave allocation logic (unchanged)
                // (same block you already have for full-day leave)
                const requestedLeaveUnits = 1;

                let targetAllocation = null;

                if (approvedLeave.leaveAllocationId) {
                  targetAllocation = allocationById.get(String(approvedLeave.leaveAllocationId)) || null;
                  if (!targetAllocation) {
                    targetAllocation = await LeaveAllocation.findByPk(approvedLeave.leaveAllocationId);
                    if (targetAllocation) allocationById.set(String(targetAllocation.leaveAllocationId), targetAllocation);
                  }
                }

                if (!targetAllocation && approvedLeave.leaveTypeId) {
                  targetAllocation = allocationByStaffType.get(`${emp.staffId}::${approvedLeave.leaveTypeId}`) || null;
                }

                if (!targetAllocation && approvedLeave.leaveTypeId) {
                  targetAllocation = await LeaveAllocation.findOne({
                    where: {
                      staffId: emp.staffId,
                      companyId: emp.companyId,
                      leaveTypeId: approvedLeave.leaveTypeId,
                      status: "Active",
                      effectiveFrom: { [Op.lte]: dateOnly },
                      effectiveTo: { [Op.gte]: dateOnly },
                    },
                    order: [["effectiveFrom", "DESC"]],
                  });

                  if (targetAllocation) {
                    allocationById.set(String(targetAllocation.leaveAllocationId), targetAllocation);
                    allocationByStaffType.set(`${emp.staffId}::${approvedLeave.leaveTypeId}`, targetAllocation);
                  }
                }

                if (targetAllocation) {
                  let available = calculateAvailableFromAllocation(targetAllocation);
                  if (
                    previousLeaveAllocationId &&
                    Number(previousLeaveAllocationId) === Number(targetAllocation.leaveAllocationId)
                  ) {
                    available += previousLeaveUsed;
                  }

                  if (available >= requestedLeaveUnits) {
                    leaveUsedDays = requestedLeaveUnits;
                    leaveAllocationIdUsed = targetAllocation.leaveAllocationId;
                    leaveRequestIdUsed = approvedLeave.leaveRequestId;

                    const leaveName =
                      approvedLeave.leaveType?.name || approvedLeave.leaveType?.leaveTypeName || "Leave";

                    attendanceStatus = `Leave - ${leaveName}`;
                  } else {
                    attendanceStatus = "Absent";
                    remarks.push("Full-day leave found but insufficient leave balance");
                  }
                } else {
                  attendanceStatus = "Absent";
                  remarks.push("Full-day leave found but no active leave allocation");
                }
              } else {
                attendanceStatus = "Absent";
                remarks.push("Worked less than half-day hours");
              }
            }
          }
        } else if (workingHours >= halfDayHours) {
          // < minimum but >= half day: try leave else mark half-day-FN/AN
          if (approvedLeave) {
            // keep your existing approved leave logic (unchanged)
            const requestedLeaveUnits = Number(getLeaveUnitsForDate(approvedLeave, dateOnly).toFixed(2));

            let targetAllocation = null;

            if (approvedLeave.leaveAllocationId) {
              targetAllocation = allocationById.get(String(approvedLeave.leaveAllocationId)) || null;
              if (!targetAllocation) {
                targetAllocation = await LeaveAllocation.findByPk(approvedLeave.leaveAllocationId);
                if (targetAllocation) allocationById.set(String(targetAllocation.leaveAllocationId), targetAllocation);
              }
            }

            if (!targetAllocation && approvedLeave.leaveTypeId) {
              targetAllocation = allocationByStaffType.get(`${emp.staffId}::${approvedLeave.leaveTypeId}`) || null;
            }

            if (!targetAllocation && approvedLeave.leaveTypeId) {
              targetAllocation = await LeaveAllocation.findOne({
                where: {
                  staffId: emp.staffId,
                  companyId: emp.companyId,
                  leaveTypeId: approvedLeave.leaveTypeId,
                  status: "Active",
                  effectiveFrom: { [Op.lte]: dateOnly },
                  effectiveTo: { [Op.gte]: dateOnly },
                },
                order: [["effectiveFrom", "DESC"]],
              });

              if (targetAllocation) {
                allocationById.set(String(targetAllocation.leaveAllocationId), targetAllocation);
                allocationByStaffType.set(`${emp.staffId}::${approvedLeave.leaveTypeId}`, targetAllocation);
              }
            }

            if (targetAllocation && requestedLeaveUnits > 0) {
              let available = calculateAvailableFromAllocation(targetAllocation);
              if (
                previousLeaveAllocationId &&
                Number(previousLeaveAllocationId) === Number(targetAllocation.leaveAllocationId)
              ) {
                available += previousLeaveUsed;
              }

              if (available >= requestedLeaveUnits) {
                leaveUsedDays = requestedLeaveUnits;
                leaveAllocationIdUsed = targetAllocation.leaveAllocationId;
                leaveRequestIdUsed = approvedLeave.leaveRequestId;

                const leaveName =
                  approvedLeave.leaveType?.name || approvedLeave.leaveType?.leaveTypeName || "Leave";

                if (requestedLeaveUnits === 0.5) {
                  const half =
                    approvedLeave.halfDayType
                      ? String(approvedLeave.halfDayType).toUpperCase().includes("AN")
                        ? "AN"
                        : "FN"
                      : getHalfDaySession();
                  attendanceStatus = `Leave - ${leaveName} - Half-day-${half}`;
                } else {
                  attendanceStatus = `Leave - ${leaveName}`;
                }
              } else {
                const half = getHalfDaySession();
                attendanceStatus = `Half-day-${half}`;
                remarks.push("Approved leave found but insufficient leave balance");
              }
            } else {
              const half = getHalfDaySession();
              attendanceStatus = `Half-day-${half}`;
              remarks.push("Approved leave found but no active leave allocation");
            }
          } else {
            const half = getHalfDaySession();
            attendanceStatus = `Half-day-${half}`;
            remarks.push("Worked below minimum hours and no approved leave");
          }
        } else {
          // < half day hours -> full-day leave only else absent
          const leaveUnits = approvedLeave ? Number(getLeaveUnitsForDate(approvedLeave, dateOnly).toFixed(2)) : 0;
          const hasApprovedFullDayLeave = Boolean(approvedLeave) && leaveUnits >= 1;

          if (hasApprovedFullDayLeave) {
            // keep your existing full-day leave allocation logic (unchanged)
            const requestedLeaveUnits = 1;

            let targetAllocation = null;

            if (approvedLeave.leaveAllocationId) {
              targetAllocation = allocationById.get(String(approvedLeave.leaveAllocationId)) || null;
              if (!targetAllocation) {
                targetAllocation = await LeaveAllocation.findByPk(approvedLeave.leaveAllocationId);
                if (targetAllocation) allocationById.set(String(targetAllocation.leaveAllocationId), targetAllocation);
              }
            }

            if (!targetAllocation && approvedLeave.leaveTypeId) {
              targetAllocation = allocationByStaffType.get(`${emp.staffId}::${approvedLeave.leaveTypeId}`) || null;
            }

            if (!targetAllocation && approvedLeave.leaveTypeId) {
              targetAllocation = await LeaveAllocation.findOne({
                where: {
                  staffId: emp.staffId,
                  companyId: emp.companyId,
                  leaveTypeId: approvedLeave.leaveTypeId,
                  status: "Active",
                  effectiveFrom: { [Op.lte]: dateOnly },
                  effectiveTo: { [Op.gte]: dateOnly },
                },
                order: [["effectiveFrom", "DESC"]],
              });

              if (targetAllocation) {
                allocationById.set(String(targetAllocation.leaveAllocationId), targetAllocation);
                allocationByStaffType.set(`${emp.staffId}::${approvedLeave.leaveTypeId}`, targetAllocation);
              }
            }

            if (targetAllocation) {
              let available = calculateAvailableFromAllocation(targetAllocation);
              if (
                previousLeaveAllocationId &&
                Number(previousLeaveAllocationId) === Number(targetAllocation.leaveAllocationId)
              ) {
                available += previousLeaveUsed;
              }

              if (available >= requestedLeaveUnits) {
                leaveUsedDays = requestedLeaveUnits;
                leaveAllocationIdUsed = targetAllocation.leaveAllocationId;
                leaveRequestIdUsed = approvedLeave.leaveRequestId;

                const leaveName =
                  approvedLeave.leaveType?.name || approvedLeave.leaveType?.leaveTypeName || "Leave";

                attendanceStatus = `Leave - ${leaveName}`;
              } else {
                attendanceStatus = "Absent";
                remarks.push("Full-day leave found but insufficient leave balance");
              }
            } else {
              attendanceStatus = "Absent";
              remarks.push("Full-day leave found but no active leave allocation");
            }
          } else {
            attendanceStatus = "Absent";
            remarks.push("Worked less than half-day hours");
          }
        }
      } else {
        attendanceStatus = "Absent";
        remarks.push("No punches");
      }
    }

    const effectiveWorkingHours = Number((workingHours + permissionUsedHours).toFixed(2));

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
      workingHours: effectiveWorkingHours,
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
      remarks: [
        ...remarks,
        `permUsedHours=${Number(permissionUsedHours.toFixed(2))}`,
        `leaveUsedDays=${Number(leaveUsedDays.toFixed(2))}`,
        `leaveAllocationId=${leaveAllocationIdUsed || 0}`,
        `leaveRequestId=${leaveRequestIdUsed || 0}`,
        `rawWorkingHours=${Number(workingHours.toFixed(2))}`,
      ].join("; "),
    };

    await sequelize.transaction(async (transaction) => {
      const permissionDelta = Number((permissionUsedHours - previousPermissionUsed).toFixed(2));
      const updatedRemainingPermission = Math.max(0, Math.round(currentPermissionRemaining - permissionDelta));
      if (updatedRemainingPermission !== Number(emp.remainingPermissionHours ?? 0)) {
        await emp.update({ remainingPermissionHours: updatedRemainingPermission }, { transaction });
      }

      const leaveDeltaMap = new Map();
      if (previousLeaveAllocationId && previousLeaveUsed > 0) {
        leaveDeltaMap.set(
          String(previousLeaveAllocationId),
          Number((leaveDeltaMap.get(String(previousLeaveAllocationId)) || 0) - previousLeaveUsed)
        );
      }
      if (leaveAllocationIdUsed && leaveUsedDays > 0) {
        leaveDeltaMap.set(
          String(leaveAllocationIdUsed),
          Number((leaveDeltaMap.get(String(leaveAllocationIdUsed)) || 0) + leaveUsedDays)
        );
      }

      for (const [allocationId, delta] of leaveDeltaMap.entries()) {
        if (!delta) continue;
        let allocation = allocationById.get(String(allocationId)) || null;
        if (!allocation) {
          allocation = await LeaveAllocation.findByPk(allocationId, { transaction });
          if (!allocation) continue;
          allocationById.set(String(allocation.leaveAllocationId), allocation);
        }
        const currentUsed = Number(allocation.usedLeaves || 0);
        const nextUsed = Number(Math.max(0, currentUsed + delta).toFixed(2));
        await allocation.update({ usedLeaves: nextUsed }, { transaction });
        allocationById.set(String(allocation.leaveAllocationId), allocation);
      }

      let attendanceRow = existing;
      if (attendanceRow) {
        await attendanceRow.update(payload, { transaction });
        updated += 1;
      } else {
        attendanceRow = await Attendance.create(payload, { transaction });
        existingByStaff.set(empKey, attendanceRow);
        created += 1;
      }

      const permissionStartTime =
        scheduledEnd && lastCheckOut && lastCheckOut < scheduledEnd
          ? String(lastCheckOut.toTimeString()).slice(0, 8)
          : null;
      const permissionEndTime = scheduledEnd ? String(scheduledEnd.toTimeString()).slice(0, 8) : null;

      if (permissionUsedHours > 0) {
        const existingPermission = await Permission.findOne({
          where: { staffId: emp.staffId, permissionDate: dateOnly },
          transaction,
        });
        if (existingPermission) {
          await existingPermission.update(
            {
              attendanceId: attendanceRow.attendanceId,
              companyId: emp.companyId,
              permissionHours: permissionUsedHours,
              permissionStartTime,
              permissionEndTime,
            },
            { transaction }
          );
        } else {
          await Permission.create(
            {
              staffId: emp.staffId,
              companyId: emp.companyId,
              attendanceId: attendanceRow.attendanceId,
              permissionDate: dateOnly,
              permissionHours: permissionUsedHours,
              permissionStartTime,
              permissionEndTime,
            },
            { transaction }
          );
        }
      } else if (previousPermissionUsed > 0) {
        await Permission.destroy({
          where: { staffId: emp.staffId, permissionDate: dateOnly },
          transaction,
        });
      }
    });

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
  const cronExpression = "* * * * *";
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
        const result = await processAttendanceForDate(new Date(2026, 1, 27));
        // await processAttendanceForDate(new Date(2026, 1, 9));
        // await processAttendanceForDate(new Date(2026, 1, 8));
        // await processAttendanceForDate(new Date(2026, 1, 7));
        // await processAttendanceForDate(new Date(2026, 1, 6));
        // await processAttendanceForDate(new Date(2026, 1, 5));
        // await processAttendanceForDate(new Date(2026, 1, 4));
        // await processAttendanceForDate(new Date(2026, 1, 3));
        // await processAttendanceForDate(new Date(2026, 1, 2));
        // await processAttendanceForDate(new Date(2026, 1, 1));
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
