import { Op } from "sequelize";
import db from '../models/index.js';

const {
  Attendance,
  Employee,
  User,
  Role,
  ShiftAssignment,
  ShiftType,
  Holiday,
  HolidayPlan,
  BiometricPunch,
  LeavePeriod,
  LeaveRequest,
  LeaveType,
  Permission,
  Company,
} = db;


const normalizeRole = (role) => String(role || "").replace(/\s+/g, "").toLowerCase();
const isSuperAdminRole = (role) => normalizeRole(role) === "superadmin";

const getAuthContext = async (req) => {
  const userId = req.user?.id;
  if (!userId) return null;

  const currentUser = await User.findByPk(userId, {
    attributes: ["userId", "companyId"],
    include: [{ model: Role, as: "role", attributes: ["roleName"] }],
  });

  if (!currentUser) return null;

  return {
    userId: currentUser.userId,
    companyId: currentUser.companyId,
    roleName: currentUser.role?.roleName || "",
    isSuperAdmin: isSuperAdminRole(currentUser.role?.roleName),
  };
};

const toDateOnly = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateTimeValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const dt = new Date(normalized);
  return Number.isNaN(dt.getTime()) ? null : dt;
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

const toTimeString = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
};

const getLeavePeriodForDate = (periods, dateOnly) => {
  if (!Array.isArray(periods) || !dateOnly) return null;
  return periods.find((p) => dateOnly >= p.startDate && dateOnly <= p.endDate) || null;
};

const getHolidayPlanForDate = (plans, dateOnly, leavePeriod) => {
  if (!Array.isArray(plans) || !dateOnly) return null;
  const applicable = plans.filter((p) => dateOnly >= p.startDate && dateOnly <= p.endDate);
  if (applicable.length === 0) return null;
  if (leavePeriod) {
    const exact = applicable.find(
      (p) => p.startDate === leavePeriod.startDate && p.endDate === leavePeriod.endDate
    );
    if (exact) return exact;
  }
  return applicable.sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)))[0];
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
    const authContext = await getAuthContext(req);
    const requestedCompanyId = req.query.companyId;

    const effectiveCompanyId = authContext?.isSuperAdmin
      ? (requestedCompanyId || null)
      : (authContext?.companyId || requestedCompanyId || null);

    if (!effectiveCompanyId) {
      return res.status(400).json({
        error: "companyId is required. Admin users can only fetch attendance from their own company.",
      });
    }

    const where = {
      companyId: effectiveCompanyId,
    };

    if (req.query.staffId) {
      where.staffId = req.query.staffId;
    }

    if (req.query.status) {
      where.attendanceStatus = req.query.status;
    }

    const dateFrom = toDateOnly(req.query.dateFrom);
    const dateTo = toDateOnly(req.query.dateTo);

    if (req.query.dateFrom && !dateFrom) {
      return res.status(400).json({ error: "Invalid dateFrom" });
    }
    if (req.query.dateTo && !dateTo) {
      return res.status(400).json({ error: "Invalid dateTo" });
    }
    if (dateFrom && dateTo && dateFrom > dateTo) {
      return res.status(400).json({ error: "dateFrom cannot be greater than dateTo" });
    }

    if (dateFrom && dateTo) {
      where.attendanceDate = { [Op.between]: [dateFrom, dateTo] };
    } else if (dateFrom) {
      where.attendanceDate = { [Op.gte]: dateFrom };
    } else if (dateTo) {
      where.attendanceDate = { [Op.lte]: dateTo };
    }

    const q = String(req.query.q || "").trim();
    const employeeWhere = {};
    if (req.query.departmentId) {
      employeeWhere.departmentId = req.query.departmentId;
    }
    if (q) {
      employeeWhere[Op.or] = [
        { staffNumber: { [Op.like]: `%${q}%` } },
        { firstName: { [Op.like]: `%${q}%` } },
        { middleName: { [Op.like]: `%${q}%` } },
        { lastName: { [Op.like]: `%${q}%` } },
      ];
    }

    const attendances = await Attendance.findAll({
      where,
      include: [
        {
          model: db.Employee,
          as: "employee",
          attributes: [
            "staffId",
            "staffNumber",
            "firstName",
            "middleName",
            "lastName",
            "departmentId",
            "status",
            "employmentStatus",
          ],
          ...(Object.keys(employeeWhere).length > 0 ? { where: employeeWhere, required: true } : {}),
        },
        { model: db.Company, as: "company", attributes: ["companyId", "companyName", "companyAcr"] },
        { model: db.ShiftType, as: "shiftType", attributes: ["shiftTypeId", "name"] },
        { model: db.ShiftAssignment, as: "shiftAssignment", attributes: ["shiftAssignmentId", "startDate", "endDate", "recurringPattern", "recurringDays"] },
        { model: db.User, as: "approver", attributes: ["userId", "userName"] },
      ],
      order: [["attendanceDate", "DESC"], ["attendanceId", "DESC"]],
    });
    res.json(attendances);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get attendance by ID
export const getAttendanceById = async (req, res) => {
  try {
    const authContext = await getAuthContext(req);
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

    if (!authContext?.isSuperAdmin && authContext?.companyId) {
      if (Number(attendance.companyId) !== Number(authContext.companyId)) {
        return res.status(403).json({ error: "Forbidden: cannot access attendance from another company" });
      }
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
    const includeAbsent = String(req.body?.includeAbsent ?? req.query?.includeAbsent ?? "true").toLowerCase() === "true";

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

    const dateToPlusOne = (() => {
      const dt = new Date(`${dateTo}T00:00:00`);
      dt.setDate(dt.getDate() + 1);
      return toDateOnly(dt);
    })();
    const punchFromTs = `${dateFrom} 00:00:00`;
    const punchToTs = `${dateToPlusOne} 23:59:59`;

    const [assignments, shiftTypes, leavePeriods, holidayPlans, punches, leaveRequests] = await Promise.all([
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
      LeavePeriod.findAll({
        where: {
          companyId,
          status: "Active",
          startDate: { [Op.lte]: dateTo },
          endDate: { [Op.gte]: dateFrom },
        },
      }),
      HolidayPlan.findAll({
        where: {
          companyId,
          status: "Active",
          startDate: { [Op.lte]: dateTo },
          endDate: { [Op.gte]: dateFrom },
        },
      }),
      BiometricPunch.findAll({
        where: {
          companyId,
          staffId: { [Op.in]: staffIds },
          punchTimestamp: { [Op.between]: [punchFromTs, punchToTs] },
          status: { [Op.ne]: "Invalid" },
        },
        order: [["punchTimestamp", "ASC"]],
      }),
      LeaveRequest.findAll({
        where: {
          companyId,
          staffId: { [Op.in]: staffIds },
          status: "Approved",
          startDate: { [Op.lte]: dateTo },
          endDate: { [Op.gte]: dateFrom },
        },
        include: [{ model: LeaveType, as: "leaveType", attributes: ["leaveTypeId", "name", "leaveTypeName"] }],
      }),
    ]);

    const assignmentMap = new Map();
    for (const a of assignments) {
      const key = String(a.staffId);
      if (!assignmentMap.has(key)) assignmentMap.set(key, []);
      assignmentMap.get(key).push(a);
    }

    const shiftTypeMap = new Map(shiftTypes.map((s) => [String(s.shiftTypeId), s]));
    const leavePeriodList = Array.isArray(leavePeriods) ? leavePeriods : [];
    const holidayPlanList = Array.isArray(holidayPlans) ? holidayPlans : [];

    const holidayPlanIdSet = new Set(holidayPlanList.map((p) => p.holidayPlanId));
    const holidays = holidayPlanIdSet.size
      ? await Holiday.findAll({
          where: {
            companyId,
            holidayPlanId: { [Op.in]: Array.from(holidayPlanIdSet) },
            holidayDate: { [Op.between]: [dateFrom, dateTo] },
            status: "Active",
          },
        })
      : [];

    const holidayMap = new Map();
    for (const h of holidays) {
      if (!holidayMap.has(String(h.holidayPlanId))) {
        holidayMap.set(String(h.holidayPlanId), new Map());
      }
      holidayMap.get(String(h.holidayPlanId)).set(h.holidayDate, h);
    }

    const leaveMap = new Map();
    for (const req of leaveRequests) {
      const leaveTypeName = req.leaveType?.name || req.leaveType?.leaveTypeName || "Leave";
      const start = req.startDate;
      const end = req.endDate;
      if (!start || !end) continue;
      for (let dt = new Date(`${start}T00:00:00`); dt <= new Date(`${end}T00:00:00`); dt.setDate(dt.getDate() + 1)) {
        const dateOnly = toDateOnly(dt);
        const key = `${req.staffId}::${dateOnly}`;
        leaveMap.set(key, leaveTypeName);
      }
    }

    const punchMap = new Map();
    for (const p of punches) {
      const key = String(p.staffId);
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

        const beginCheckInBefore = Number(shiftType?.beginCheckInBefore || 0);
        const allowCheckOutAfter = Number(shiftType?.allowCheckOutAfter || 0);
        const punchWindowStart = scheduledStart
          ? new Date(scheduledStart.getTime() - beginCheckInBefore * 60 * 1000)
          : null;
        const punchWindowEnd = scheduledEnd
          ? new Date(scheduledEnd.getTime() + allowCheckOutAfter * 60 * 1000)
          : null;

        const staffPunches = punchMap.get(String(emp.staffId)) || [];
        const dayPunches = punchWindowStart && punchWindowEnd
          ? staffPunches.filter((p) => {
              const ts = parseDateTimeValue(p.punchTimestamp);
              if (!ts) return false;
              return ts >= punchWindowStart && ts <= punchWindowEnd;
            })
          : staffPunches.filter((p) => String(p.punchDate) === String(dateOnly));

        dayPunches.sort((a, b) => {
          const aTs = parseDateTimeValue(a.punchTimestamp);
          const bTs = parseDateTimeValue(b.punchTimestamp);
          return (aTs?.getTime() || 0) - (bTs?.getTime() || 0);
        });

        const shiftWeeklyOffDays = normalizeWeeklyOffDays(shiftType?.weeklyOff);
        const isShiftWeeklyOff = isDateWeeklyOffByShift(dateOnly, shiftWeeklyOffDays);
        const leavePeriod = getLeavePeriodForDate(leavePeriodList, dateOnly);
        const holidayPlan = getHolidayPlanForDate(holidayPlanList, dateOnly, leavePeriod);
        const planHolidayMap = holidayPlan ? holidayMap.get(String(holidayPlan.holidayPlanId)) : null;
        const holidayRow = planHolidayMap ? planHolidayMap.get(dateOnly) : null;
        const isHoliday = Boolean(holidayRow && holidayRow.type !== "Week Off");
        const isWeekOff = Boolean(isShiftWeeklyOff);
        if (!includeAbsent && dayPunches.length === 0 && !isHoliday && !isWeekOff) continue;

        const firstPunch = dayPunches[0] || null;
        const lastPunch = dayPunches.length > 0 ? dayPunches[dayPunches.length - 1] : null;
        const firstCheckIn = parseDateTimeValue(firstPunch?.punchTimestamp);
        const lastCheckOut = parseDateTimeValue(lastPunch?.punchTimestamp);

        const totalCheckIns = dayPunches.length;
        const totalCheckOuts = dayPunches.length;

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
        const minimumHours = Number(shiftType?.minimumHours || shiftType?.absentHours || 6);
        const hasPunches = dayPunches.length > 0;

        const currentRemaining = Number(remainingPermissionMap.get(String(emp.staffId)) || 0);
        const shortfallHours = Math.max(0, Number((minimumHours - workingHours).toFixed(2)));
        const approvedLeaveName = leaveMap.get(`${emp.staffId}::${dateOnly}`) || null;

        let permissionUsedHours = 0;
        let attendanceStatus = "Absent";

        if (workingHours >= minimumHours) {
          attendanceStatus = "Present";
        } else if (
          hasPunches &&
          shortfallHours > 0 &&
          shortfallHours <= 2 &&
          currentRemaining >= Math.ceil(shortfallHours)
        ) {
          permissionUsedHours = Math.ceil(shortfallHours);
          attendanceStatus = "Permission";
        } else if (workingHours >= halfDayHours) {
          if (approvedLeaveName) {
            attendanceStatus = `Leave - ${approvedLeaveName}`;
          } else {
            attendanceStatus = "Half-Day";
          }
        } else {
          if (isWeekOff) {
            attendanceStatus = "Week Off";
          } else if (isHoliday) {
            attendanceStatus = "Holiday";
          } else if (approvedLeaveName) {
            attendanceStatus = `Leave - ${approvedLeaveName}`;
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
          workingHours: Number((workingHours + permissionUsedHours).toFixed(2)),
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

        const permissionStartTime =
          scheduledEnd && lastCheckOut && lastCheckOut < scheduledEnd
            ? toTimeString(lastCheckOut)
            : null;
        const permissionEndTime = scheduledEnd ? toTimeString(scheduledEnd) : null;

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
          if (permissionUsedHours > 0) {
            const existingPermission = await Permission.findOne({
              where: { staffId: emp.staffId, permissionDate: dateOnly },
            });
            if (existingPermission) {
              await existingPermission.update({
                attendanceId: existing.attendanceId,
                companyId,
                permissionHours: permissionUsedHours,
                permissionStartTime,
                permissionEndTime,
                updatedBy: req.body?.updatedBy || null,
              });
            } else {
              await Permission.create({
                staffId: emp.staffId,
                companyId,
                attendanceId: existing.attendanceId,
                permissionDate: dateOnly,
                permissionHours: permissionUsedHours,
                permissionStartTime,
                permissionEndTime,
                createdBy: req.body?.createdBy || null,
                updatedBy: req.body?.updatedBy || null,
              });
            }
          } else if (prevPermUsed > 0) {
            await Permission.destroy({
              where: { staffId: emp.staffId, permissionDate: dateOnly },
            });
          }
          updated += 1;
        } else {
          const newRemaining = Math.max(0, Math.round(currentRemaining - permissionUsedHours));
          remainingPermissionMap.set(String(emp.staffId), newRemaining);
          await emp.update({ remainingPermissionHours: newRemaining });
          permissionConsumedHours += permissionUsedHours;

          const createdAttendance = await Attendance.create({
            ...payload,
            createdBy: req.body?.createdBy || null,
          });
          if (permissionUsedHours > 0) {
            await Permission.create({
              staffId: emp.staffId,
              companyId,
              attendanceId: createdAttendance.attendanceId,
              permissionDate: dateOnly,
              permissionHours: permissionUsedHours,
              permissionStartTime,
              permissionEndTime,
              createdBy: req.body?.createdBy || null,
              updatedBy: req.body?.updatedBy || null,
            });
          }
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
