
/* eslint-disable no-console */
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { Op } from "sequelize";
import db from "../models/index.js";
import { hashPassword } from "../utils/password.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const {
  sequelize,
  Company,
  Role,
  Department,
  Designation,
  User,
  Employee,
  EmployeeGrade,
  ShiftType,
  ShiftAssignment,
  BiometricDevice,
  HolidayPlan,
  Holiday,
  LeaveType,
  LeavePolicy,
  LeavePeriod,
  LeaveAllocation,
} = db;

const DEFAULT_PASSWORD_PLAIN = "123";

const REQUIRED_STATUSES = [
  "Present",
  "Absent",
  "Half-Day",
  "Late",
  "Early Exit",
  "Leave",
  "Holiday",
  "Week Off",
  "Permission",
];

const HOLIDAYS_IN_TN = [
  { date: "2025-12-25", description: "Christmas", type: "Holiday" },
  { date: "2026-01-01", description: "New Year's Day", type: "Holiday" },
  { date: "2026-01-14", description: "Bhogi", type: "Holiday" },
  { date: "2026-01-15", description: "Pongal", type: "Holiday" },
  { date: "2026-01-16", description: "Thiruvalluvar Day", type: "Holiday" },
  { date: "2026-01-17", description: "Uzhavar Thirunal", type: "Holiday" },
  { date: "2026-01-26", description: "Republic Day", type: "Holiday" },
  { date: "2026-02-01", description: "Thaipoosam", type: "Holiday" },
];

const toDateOnly = (d) => {
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const atTime = (dateOnly, hhmmss) => new Date(`${dateOnly}T${hhmmss}`);

const diffHours = (a, b) => {
  if (!a || !b) return 0;
  return Math.max(0, (b.getTime() - a.getTime()) / (1000 * 60 * 60));
};

const isNeedReprepareError = (error) =>
  error?.original?.code === "ER_NEED_REPREPARE" ||
  error?.parent?.code === "ER_NEED_REPREPARE" ||
  error?.code === "ER_NEED_REPREPARE";

async function withReprepareRetry(task, label = "db-op", retries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (!isNeedReprepareError(error) || attempt === retries) {
        throw error;
      }
      console.warn(`[retry:${label}] ER_NEED_REPREPARE (attempt ${attempt}/${retries})`);
      await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
    }
  }
  throw lastError;
}

async function findOrCreateParanoid(model, where, defaults, updateOnFind = {}) {
  const row = await model.findOne({ where, paranoid: false });
  if (row) {
    if (row.deletedAt) {
      await row.restore();
    }
    if (Object.keys(updateOnFind).length > 0) {
      await withReprepareRetry(() => row.update(updateOnFind), `${model.name}.update`);
    }
    return row;
  }
  return model.create({ ...defaults });
}

async function upsertRow(model, where, payload) {
  const row = await model.findOne({ where, paranoid: false });
  if (row) {
    if (row.deletedAt) {
      await row.restore();
    }
    await row.update(payload);
    return row;
  }
  return model.create({ ...payload });
}

const buildRes = () => {
  const res = {};
  res.statusCode = 200;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    return res;
  };
  return res;
};

async function runController(controller, req) {
  const res = buildRes();
  await controller(req, res);
  if (res.statusCode >= 400) {
    const message = res.body?.error || res.body?.message || "Controller failed";
    throw new Error(message);
  }
  return res.body;
}

function getPast60DayRange() {
  return {
    startDate: "2026-01-01",
    endDate: "2026-02-28",
  };
}

function getEveryDate(startDate, endDate) {
  const out = [];
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    out.push(toDateOnly(d));
  }
  return out;
}

function baseStatusByIndex(idx) {
  if (idx % 29 === 0) return "Leave";
  if (idx % 23 === 0) return "Absent";
  if (idx % 19 === 0) return "Early Exit";
  if (idx % 17 === 0) return "Late";
  if (idx % 13 === 0) return "Half-Day";
  if (idx % 11 === 0) return "Permission";
  return "Present";
}

const LEAVE_PERIODS = [
  {
    key: "previous",
    name: "FY 2024-25",
    startDate: "2024-04-01",
    endDate: "2025-03-31",
    status: "Inactive",
  },
  {
    key: "current",
    name: "FY 2025-26",
    startDate: "2025-04-01",
    endDate: "2026-03-31",
    status: "Active",
  },
];

const SENIOR_DESIGNATION_NAMES = new Set([
  "System Administrator",
  "HR Executive",
  "Professor",
]);

function ensureAllRequiredStatuses(statusByDate, workingDays, holidayDates, weekOffDates) {
  const counts = {};
  Object.values(statusByDate).forEach((s) => {
    counts[s] = (counts[s] || 0) + 1;
  });

  const missing = REQUIRED_STATUSES.filter((s) => (counts[s] || 0) === 0);
  if (missing.length === 0) return;

  const replaceable = workingDays.filter(
    (d) => !holidayDates.has(d) && !weekOffDates.has(d)
  );

  let idx = 0;
  for (const status of missing) {
    if (status === "Holiday" || status === "Week Off") continue;
    if (idx >= replaceable.length) break;
    statusByDate[replaceable[idx]] = status;
    idx += 1;
  }
}

function getPunchTimesForStatus(status) {
  switch (status) {
    case "Present":
      return { inTime: "08:57:00", outTime: "17:08:00" };
    case "Late":
      return { inTime: "09:31:00", outTime: "17:14:00" };
    case "Early Exit":
      return { inTime: "08:58:00", outTime: "16:20:00" };
    case "Half-Day":
      return { inTime: "09:05:00", outTime: "13:35:00" };
    case "Permission":
      return { inTime: "09:04:00", outTime: "14:15:00" };
    default:
      return null;
  }
}

async function seedMasters() {
  const company = await findOrCreateParanoid(
    Company,
    { companyAcr: "NEC" },
    {
      companyName: "National Engineering College",
      companyAcr: "NEC",
      email: "hr@nec.edu.in",
      phone: "0462-2555000",
      website: "https://nec.edu.in",
      addresses: {
        registered: "Kovilpatti, Thoothukudi, Tamil Nadu, India",
      },
      financialYearStart: "2025-04-01",
      financialYearEnd: "2026-03-31",
      permissionHoursPerMonth: 3,
      status: "Active",
    },
    {
      companyName: "National Engineering College",
      permissionHoursPerMonth: 3,
      status: "Active",
    }
  );

  let superAdminRole = await Role.findOne({
    where: { roleName: { [Op.in]: ["super admin", "Super Admin"] } },
    paranoid: false,
  });
  if (!superAdminRole) {
    superAdminRole = await Role.create({ roleName: "super admin", status: "Active" });
  } else {
    if (superAdminRole.deletedAt) {
      await superAdminRole.restore();
    }
  }

  let staffRole = await Role.findOne({
    where: { roleName: { [Op.in]: ["staff", "Staff"] } },
    paranoid: false,
  });
  if (!staffRole) {
    staffRole = await Role.create({ roleName: "staff", status: "Active" });
  } else {
    if (staffRole.deletedAt) {
      await staffRole.restore();
    }
  }

  const departmentsToSeed = [
    { departmentName: "cse", departmentAcr: "CSE" },
    { departmentName: "ece", departmentAcr: "ECE" },
    { departmentName: "mech", departmentAcr: "MECH" },
    { departmentName: "civil", departmentAcr: "CIVIL" },
    { departmentName: "eee", departmentAcr: "EEE" },
    { departmentName: "it", departmentAcr: "IT" },
    { departmentName: "aids", departmentAcr: "AIDS" },
    { departmentName: "admin", departmentAcr: "ADMIN" },
  ];

  const departments = {};
  for (const d of departmentsToSeed) {
    const row = await findOrCreateParanoid(
      Department,
      { companyId: company.companyId, departmentName: d.departmentName },
      {
        ...d,
        companyId: company.companyId,
        status: "Active",
      },
      {
        departmentAcr: d.departmentAcr,
        status: "Active",
      }
    );
    departments[d.departmentName] = row;
  }

  const designationsToSeed = [
    { designationName: "System Administrator", designationAcr: "SYSADM" },
    { designationName: "HR Executive", designationAcr: "HREX" },
    { designationName: "Professor", designationAcr: "PROF" },
    { designationName: "Assistant Professor", designationAcr: "ASSTPROF" },
    { designationName: "Office Staff", designationAcr: "OSTAFF" },
    { designationName: "Lab Assistant", designationAcr: "LABASST" },
  ];

  const designations = {};
  for (const d of designationsToSeed) {
    const row = await findOrCreateParanoid(
      Designation,
      { companyId: company.companyId, designationName: d.designationName },
      {
        ...d,
        companyId: company.companyId,
        status: "Active",
      },
      {
        designationAcr: d.designationAcr,
        status: "Active",
      }
    );
    designations[d.designationName] = row;
  }

  let shiftType = await ShiftType.findOne({
    where: { companyId: company.companyId, name: "General Shift NEC" },
    paranoid: false,
  });
  if (!shiftType) {
    shiftType = await ShiftType.create({
      name: "General Shift NEC",
      startTime: "09:00:00",
      endTime: "17:00:00",
      beginCheckInBefore: 20,
      allowCheckOutAfter: 20,
      enableAutoAttendance: true,
      requireCheckIn: true,
      requireCheckOut: true,
      allowMultipleCheckIns: false,
      autoMarkAbsentIfNoCheckIn: false,
      workingHoursCalculation: "first_to_last",
      halfDayHours: 4,
      absentHours: 6,
      enableLateEntry: true,
      lateGracePeriod: 15,
      enableEarlyExit: true,
      earlyExitPeriod: 15,
      markAutoAttendanceOnHolidays: false,
      status: "Active",
      companyId: company.companyId,
    });
  } else {
    if (shiftType.deletedAt) {
      await shiftType.restore();
    }
    await withReprepareRetry(() => shiftType.update({ status: "Active" }), "ShiftType.update");
  }

  let device = await BiometricDevice.findOne({
    where: { deviceIp: "10.20.30.40" },
    paranoid: false,
  });
  if (!device) {
    device = await BiometricDevice.create({
      name: "NEC Main Gate Device",
      deviceIp: "10.20.30.40",
      location: "Main Gate",
      status: "Active",
      isAutoSyncEnabled: true,
      companyId: company.companyId,
    });
  } else {
    if (device.deletedAt) {
      await device.restore();
    }
    await withReprepareRetry(() => device.update({
      name: "NEC Main Gate Device",
      location: "Main Gate",
      companyId: company.companyId,
      status: "Active",
    }), "BiometricDevice.update");
  }

  return {
    company,
    roles: {
      superAdminRole,
      adminRole: superAdminRole,
      teachingRole: staffRole,
      nonTeachingRole: staffRole,
      studentRole: staffRole,
    },
    departments,
    designations,
    grades: {},
    shiftTypes: {
      teaching: shiftType,
      nonTeaching: shiftType,
      night: shiftType,
    },
    device,
  };
}

async function seedUsersAndEmployees({ company, roles, departments, designations, shiftTypes }) {
  const seededPasswordHash = await hashPassword(DEFAULT_PASSWORD_PLAIN);

  const userSeedData = [
    {
      userNumber: "9000001",
      userName: "Super Admin",
      userMail: "superadmin@nec.edu.in",
      roleId: roles.superAdminRole.roleId,
      departmentId: departments.admin.departmentId,
      roleKey: "superAdmin",
      shiftKey: "nonTeaching",
    },
    {
      userNumber: "9000002",
      userName: "Prof Arjun",
      userMail: "arjun@nec.edu.in",
      roleId: roles.teachingRole.roleId,
      departmentId: departments.cse.departmentId,
      roleKey: "teaching",
      shiftKey: "teaching",
    },
    {
      userNumber: "9000003",
      userName: "Prof Meera",
      userMail: "meera@nec.edu.in",
      roleId: roles.teachingRole.roleId,
      departmentId: departments.ece.departmentId,
      roleKey: "teaching",
      shiftKey: "teaching",
    },
    {
      userNumber: "9000004",
      userName: "Asst Prof Ravi",
      userMail: "ravi@nec.edu.in",
      roleId: roles.teachingRole.roleId,
      departmentId: departments.it.departmentId,
      roleKey: "teaching",
      shiftKey: "teaching",
    },
    {
      userNumber: "9000005",
      userName: "Asst Prof Nisha",
      userMail: "nisha@nec.edu.in",
      roleId: roles.teachingRole.roleId,
      departmentId: departments.mech.departmentId,
      roleKey: "teaching",
      shiftKey: "teaching",
    },
    {
      userNumber: "9000006",
      userName: "Staff Karthik",
      userMail: "karthik@nec.edu.in",
      roleId: roles.nonTeachingRole.roleId,
      departmentId: departments.admin.departmentId,
      roleKey: "nonTeaching",
      shiftKey: "nonTeaching",
    },
    {
      userNumber: "9000007",
      userName: "Staff Priya",
      userMail: "priya@nec.edu.in",
      roleId: roles.nonTeachingRole.roleId,
      departmentId: departments.civil.departmentId,
      roleKey: "nonTeaching",
      shiftKey: "nonTeaching",
    },
    {
      userNumber: "9000008",
      userName: "Lab Raj",
      userMail: "raj@nec.edu.in",
      roleId: roles.nonTeachingRole.roleId,
      departmentId: departments.eee.departmentId,
      roleKey: "nonTeaching",
      shiftKey: "night",
    },
    {
      userNumber: "9000009",
      userName: "Clerk Siva",
      userMail: "siva@nec.edu.in",
      roleId: roles.nonTeachingRole.roleId,
      departmentId: departments.admin.departmentId,
      roleKey: "nonTeaching",
      shiftKey: "nonTeaching",
    },
    {
      userNumber: "9000010",
      userName: "Staff Deepa",
      userMail: "deepa@nec.edu.in",
      roleId: roles.nonTeachingRole.roleId,
      departmentId: departments.it.departmentId,
      roleKey: "nonTeaching",
      shiftKey: "nonTeaching",
    },
  ];

  const users = {};
  const employees = {};

  for (const u of userSeedData) {
    let user = await User.findOne({
      where: { userMail: u.userMail },
      paranoid: false,
    });

    if (!user) {
      user = await User.create({
        userNumber: u.userNumber,
        userName: u.userName,
        userMail: u.userMail,
        roleId: u.roleId,
        companyId: company.companyId,
        departmentId: u.departmentId,
        password: seededPasswordHash,
        status: "Active",
      });
    } else {
      if (user.deletedAt) {
        await user.restore();
      }
      await withReprepareRetry(() => user.update({
        userNumber: u.userNumber,
        userName: u.userName,
        userMail: u.userMail,
        roleId: u.roleId,
        companyId: company.companyId,
        departmentId: u.departmentId,
        password: seededPasswordHash,
        status: "Active",
      }), "User.update");
    }
    users[u.userMail] = user;
  }

  const adminUser =
    users["s.praveenkumar.offl@gmail.com"] ||
    users["2312078@nec.edu.in"] ||
    Object.values(users)[0];

  await withReprepareRetry(() => company.update({
    createdBy: adminUser.userId,
    updatedBy: adminUser.userId,
  }), "Company.update");

  for (const seed of userSeedData) {
    const user = await User.findOne({
      where: { userMail: seed.userMail },
      paranoid: false,
    });
    if (!user) continue;
    let employee = await Employee.findOne({
      where: { staffNumber: user.userNumber },
      paranoid: false,
    });

    const nameParts = (seed.userName || "Staff User").trim().split(/\s+/);
    const firstName = nameParts[0] || "Staff";
    const lastName = nameParts.slice(1).join(" ") || null;
    const designationName =
      seed.roleKey === "superAdmin"
        ? "System Administrator"
        : seed.roleKey === "teaching"
          ? (seed.userName.startsWith("Prof") ? "Professor" : "Assistant Professor")
          : (seed.userName.startsWith("Lab") ? "Lab Assistant" : "Office Staff");
    const designationId = designations[designationName]?.designationId || null;
    const selectedShiftType =
      shiftTypes?.[seed.shiftKey] ||
      (seed.roleKey === "teaching" ? shiftTypes?.teaching : shiftTypes?.nonTeaching);

    const employeePayload = {
      staffNumber: user.userNumber,
      biometricNumber: `BIO${user.userNumber}`,
      companyId: company.companyId,
      firstName,
      lastName,
      personalEmail: user.userMail,
      officialEmail: user.userMail,
      departmentId: user.departmentId,
      designationId,
      dateOfJoining: "2025-06-01",
      status: "Active",
      shiftTypeId: selectedShiftType?.shiftTypeId || null,
      employmentStatus: "Active",
      remainingPermissionHours: Number(company.permissionHoursPerMonth || 0),
      createdBy: adminUser.userId,
      updatedBy: adminUser.userId,
    };

    if (!employee) {
      employee = await Employee.create(employeePayload);
    } else {
      if (employee.deletedAt) {
        await employee.restore();
      }
      await withReprepareRetry(() => employee.update(employeePayload), "Employee.update");
    }
    employees[seed.userMail] = employee;
  }

  return { users, employees, adminUser, userSeedData };
}

async function ensureHolidayData({
  companyId,
  createdBy,
  startDate,
  endDate,
}) {
  let holidayPlan = await HolidayPlan.findOne({
    where: {
      companyId,
      holidayPlanName: `NEC Default Holiday Plan ${startDate} to ${endDate}`,
    },
    paranoid: false,
  });

  if (!holidayPlan) {
    holidayPlan = await HolidayPlan.create({
      holidayPlanName: `NEC Default Holiday Plan ${startDate} to ${endDate}`,
      startDate,
      endDate,
      weeklyOff: { sunday: true, saturday: false },
      status: "Active",
      companyId,
      createdBy,
      updatedBy: createdBy,
    });
  } else {
    if (holidayPlan.deletedAt) {
      await holidayPlan.restore();
    }
    await withReprepareRetry(() => holidayPlan.update({
      startDate,
      endDate,
      weeklyOff: { sunday: true, saturday: false },
      status: "Active",
      updatedBy: createdBy,
    }), "HolidayPlan.update");
  }

  const holidaysInRange = HOLIDAYS_IN_TN.filter(
    (h) => h.date >= startDate && h.date <= endDate
  );

  const allDates = getEveryDate(startDate, endDate);
  const sundays = allDates.filter((d) => new Date(`${d}T00:00:00`).getDay() === 0);
  const holidayDateSet = new Set(holidaysInRange.map((h) => h.date));

  for (const h of holidaysInRange) {
    const existing = await Holiday.findOne({
      where: {
        holidayPlanId: holidayPlan.holidayPlanId,
        holidayDate: h.date,
      },
      paranoid: false,
    });
    if (!existing) {
      await Holiday.create({
        holidayDate: h.date,
        description: h.description,
        type: h.type,
        holidayPlanId: holidayPlan.holidayPlanId,
        companyId,
        status: "Active",
        createdBy,
        updatedBy: createdBy,
      });
    } else {
      if (existing.deletedAt) {
        await existing.restore();
      }
      await withReprepareRetry(() => existing.update({
        description: h.description,
        type: h.type,
        companyId,
        status: "Active",
        updatedBy: createdBy,
      }), "Holiday.update");
    }
  }

  for (const sunday of sundays) {
    if (holidayDateSet.has(sunday)) continue;
    const existing = await Holiday.findOne({
      where: {
        holidayPlanId: holidayPlan.holidayPlanId,
        holidayDate: sunday,
      },
      paranoid: false,
    });
    if (!existing) {
      await Holiday.create({
        holidayDate: sunday,
        description: "Sunday Week Off",
        type: "Week Off",
        holidayPlanId: holidayPlan.holidayPlanId,
        companyId,
        status: "Active",
        createdBy,
        updatedBy: createdBy,
      });
    } else {
      if (existing.deletedAt) {
        await existing.restore();
      }
      await withReprepareRetry(() => existing.update({
        description: existing.type === "Holiday" ? existing.description : "Sunday Week Off",
        type: existing.type === "Holiday" ? "Holiday" : "Week Off",
        companyId,
        status: "Active",
        updatedBy: createdBy,
      }), "Holiday.update");
    }
  }

  const allHolidayRows = await Holiday.findAll({
    where: {
      holidayPlanId: holidayPlan.holidayPlanId,
      holidayDate: { [Op.between]: [startDate, endDate] },
      status: "Active",
    },
    order: [["holidayDate", "ASC"]],
  });

  return {
    holidayPlan,
    holidayRows: allHolidayRows,
  };
}

async function assignEmployeeProfiles({
  employees,
  userSeedData,
  designations,
  grades,
  shiftTypes,
  company,
  adminUser,
}) {
  const employeeByMail = {};
  for (const seed of userSeedData) {
    const employee = employees[seed.userMail];
    if (employee) {
      employeeByMail[seed.userMail] = employee;
    }
  }

  for (const seed of userSeedData) {
    const employee = employeeByMail[seed.userMail];
    if (!employee) continue;

    const isTeaching = seed.roleKey === "teaching";
    const designationName =
      seed.designationName ||
      (seed.roleKey === "superAdmin"
        ? "System Administrator"
        : (isTeaching
          ? (seed.userName.startsWith("Prof") ? "Professor" : "Assistant Professor")
          : (seed.userName.startsWith("Lab") ? "Lab Assistant" : "Office Staff")));
    const designation = designations[designationName];

    const gradeName =
      seed.gradeName ||
      (designationName === "Professor" || designationName === "System Administrator"
        ? "Grade A - Senior"
        : designationName === "Assistant Professor"
          ? "Grade B - Mid"
          : "Grade C - Junior");
    const grade = grades[gradeName];
    const shiftType =
      shiftTypes[seed.shiftKey] ||
      (isTeaching ? shiftTypes.teaching : shiftTypes.nonTeaching);

    await employee.update({
      biometricNumber: employee.biometricNumber || `BIO${employee.staffNumber}`,
      companyId: company.companyId,
      designationId: designation?.designationId || employee.designationId,
      employeeGradeId: grade?.employeeGradeId || employee.employeeGradeId,
      shiftTypeId: shiftType?.shiftTypeId || employee.shiftTypeId,
      employmentStatus: "Active",
      status: "Active",
      updatedBy: adminUser.userId,
    });
  }
}

async function seedShiftAssignments({
  employees,
  userSeedData,
  shiftTypes,
  company,
  adminUser,
  startDate,
  endDate,
}) {
  for (const seed of userSeedData) {
    const employee = employees[seed.userMail];
    if (!employee) continue;

    const shiftType =
      shiftTypes[seed.shiftKey] ||
      (seed.roleKey === "teaching" ? shiftTypes.teaching : shiftTypes.nonTeaching);
    const shiftTypeId = shiftType?.shiftTypeId || employee.shiftTypeId;
    if (!shiftTypeId) continue;

    let shiftAssignment = await ShiftAssignment.findOne({
      where: { staffId: employee.staffId },
      paranoid: false,
    });
    if (!shiftAssignment) {
      shiftAssignment = await ShiftAssignment.create({
        staffId: employee.staffId,
        shiftTypeId,
        startDate,
        endDate,
        isRecurring: true,
        recurringPattern: "weekly",
        recurringDays: [1, 2, 3, 4, 5, 6],
        status: "Active",
        notes: "Seeded shift assignment",
        companyId: company.companyId,
        createdBy: adminUser.userId,
        updatedBy: adminUser.userId,
      });
    } else {
      if (shiftAssignment.deletedAt) {
        await shiftAssignment.restore();
      }
      await shiftAssignment.update({
        shiftTypeId,
        startDate,
        endDate,
        recurringPattern: "weekly",
        recurringDays: [1, 2, 3, 4, 5, 6],
        isRecurring: true,
        status: "Active",
        companyId: company.companyId,
        updatedBy: adminUser.userId,
      });
    }
  }
}

async function main() {
  const { startDate, endDate } = getPast60DayRange();

  const masterData = await seedMasters();
  const { company, device, shiftTypes, designations, grades } = masterData;
  const { users, employees, adminUser, userSeedData } = await seedUsersAndEmployees({
    company,
    roles: masterData.roles,
    departments: masterData.departments,
    designations,
    shiftTypes,
  });

  await assignEmployeeProfiles({
    employees,
    userSeedData,
    designations,
    grades,
    shiftTypes,
    company,
    adminUser,
  });

  await seedShiftAssignments({
    employees,
    userSeedData,
    shiftTypes,
    company,
    adminUser,
    startDate,
    endDate,
  });

  const { holidayPlan } = await ensureHolidayData({
    companyId: company.companyId,
    createdBy: adminUser.userId,
    startDate,
    endDate,
  });

  console.log("Initial master + user seed completed.");
  console.log(`Seed login password: ${DEFAULT_PASSWORD_PLAIN}`);
  console.log(
    JSON.stringify(
      {
        company: {
          companyId: company.companyId,
          companyName: company.companyName,
          companyAcr: company.companyAcr,
        },
        roles: ["Super Admin", "Admin", "Teaching Staff", "Non-Teaching Staff", "Student"],
        departments: ["cse", "ece", "mech", "civil", "eee", "it", "aids", "admin"],
        users: userSeedData.map((seed) => ({
          userId: users[seed.userMail]?.userId,
          userMail: seed.userMail,
          role: seed.roleKey,
        })),
        holidayPlanId: holidayPlan.holidayPlanId,
        deviceId: device.deviceId,
      },
      null,
      2
    )
  );
}

main()
  .then(async () => {
    await sequelize.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    try {
      await sequelize.close();
    } catch {
      // ignore close failures
    }
    process.exit(1);
  });
