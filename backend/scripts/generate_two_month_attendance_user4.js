
/* eslint-disable no-console */
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { Op } from "sequelize";
import db from "../models/index.js";

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
  ShiftType,
  ShiftAssignment,
  BiometricDevice,
  HolidayPlan,
  Holiday,
  BiometricPunch,
  Attendance,
} = db;

const DEFAULT_PASSWORD =
  "$2b$10$EeTJeYSeXlTDxqKAD4KRHe7APGxgNSGbLblzHhzUnfEKA984rXmoG";

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

async function findOrCreateParanoid(model, where, defaults, updateOnFind = {}) {
  const row = await model.findOne({ where, paranoid: false });
  if (row) {
    if (row.deletedAt) {
      await row.restore();
    }
    if (Object.keys(updateOnFind).length > 0) {
      await row.update(updateOnFind);
    }
    return row;
  }
  return model.create({ ...defaults });
}

function getPast60DayRange() {
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  const start = new Date(end);
  start.setDate(start.getDate() - 59);
  return {
    startDate: toDateOnly(start),
    endDate: toDateOnly(end),
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

  const superAdminRole = await findOrCreateParanoid(
    Role,
    { roleName: "Super Admin" },
    { roleName: "Super Admin", status: "Active" },
    { status: "Active" }
  );
  const staffRole = await findOrCreateParanoid(
    Role,
    { roleName: "Staff" },
    { roleName: "Staff", status: "Active" },
    { status: "Active" }
  );

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
    { designationName: "Office Staff", designationAcr: "OSTAFF" },
    { designationName: "HR Executive", designationAcr: "HREX" },
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
    await shiftType.update({ status: "Active" });
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
    await device.update({
      name: "NEC Main Gate Device",
      location: "Main Gate",
      companyId: company.companyId,
      status: "Active",
    });
  }

  return {
    company,
    roles: {
      superAdminRole,
      staffRole,
    },
    departments,
    designations,
    shiftType,
    device,
  };
}

async function seedUsersAndEmployees({ company, roles, departments, designations, shiftType }) {
  const userSeedData = [
    {
      userNumber: "2312078",
      userName: "Super Admin 1",
      userMail: "2312078@nec.edu.in",
      roleId: roles.superAdminRole.roleId,
      departmentId: departments.admin.departmentId,
      employee: {
        firstName: "Super",
        lastName: "AdminOne",
        designationId: designations["System Administrator"].designationId,
      },
    },
    {
      userNumber: "2312080",
      userName: "Super Admin 2",
      userMail: "2312080@nec.edu.in",
      roleId: roles.superAdminRole.roleId,
      departmentId: departments.admin.departmentId,
      employee: {
        firstName: "Super",
        lastName: "AdminTwo",
        designationId: designations["System Administrator"].designationId,
      },
    },
    {
      userNumber: "9999999",
      userName: "S Praveenkumar",
      userMail: "s.praveenkumar.offl@gmail.com",
      roleId: roles.superAdminRole.roleId,
      departmentId: departments.admin.departmentId,
      employee: {
        firstName: "Praveenkumar",
        lastName: "S",
        designationId: designations["HR Executive"].designationId,
      },
    },
    {
      userNumber: "2312077",
      userName: "Staff User",
      userMail: "2312077@nec.edu.in",
      roleId: roles.staffRole.roleId,
      departmentId: departments.it.departmentId,
      employee: {
        firstName: "Staff",
        lastName: "NEC",
        designationId: designations["Office Staff"].designationId,
      },
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
        password: DEFAULT_PASSWORD,
        status: "Active",
      });
    } else {
      if (user.deletedAt) {
        await user.restore();
      }
      await user.update({
        userNumber: u.userNumber,
        userName: u.userName,
        userMail: u.userMail,
        roleId: u.roleId,
        companyId: company.companyId,
        departmentId: u.departmentId,
        password: DEFAULT_PASSWORD,
        status: "Active",
      });
    }
    users[u.userMail] = user;
  }

  const adminUser =
    users["s.praveenkumar.offl@gmail.com"] ||
    users["2312078@nec.edu.in"] ||
    Object.values(users)[0];

  await company.update({
    createdBy: adminUser.userId,
    updatedBy: adminUser.userId,
  });

  for (const u of userSeedData) {
    const user = users[u.userMail];
    let employee = await Employee.findOne({
      where: { staffNumber: user.userNumber },
      paranoid: false,
    });

    const employeePayload = {
      staffNumber: user.userNumber,
      biometricNumber: `BIO${user.userNumber}`,
      firstName: u.employee.firstName,
      lastName: u.employee.lastName,
      personalEmail: user.userMail,
      officialEmail: user.userMail,
      departmentId: user.departmentId,
      designationId: u.employee.designationId,
      dateOfJoining: "2025-06-01",
      status: "Active",
      shiftTypeId: shiftType.shiftTypeId,
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
      await employee.update(employeePayload);
    }
    employees[u.userMail] = employee;
  }

  for (const user of Object.values(users)) {
    await user.update({
      createdBy: adminUser.userId,
      updatedBy: adminUser.userId,
    });
  }

  return { users, employees, adminUser };
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
    await holidayPlan.update({
      startDate,
      endDate,
      weeklyOff: { sunday: true, saturday: false },
      status: "Active",
      updatedBy: createdBy,
    });
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
      await existing.update({
        description: h.description,
        type: h.type,
        companyId,
        status: "Active",
        updatedBy: createdBy,
      });
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
      await existing.update({
        description: existing.type === "Holiday" ? existing.description : "Sunday Week Off",
        type: existing.type === "Holiday" ? "Holiday" : "Week Off",
        companyId,
        status: "Active",
        updatedBy: createdBy,
      });
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

async function seedAttendanceAndPunchesForStaff({
  staffEmployee,
  staffUser,
  company,
  shiftType,
  shiftAssignment,
  device,
  holidayRows,
  startDate,
  endDate,
  adminUserId,
}) {
  const holidayMap = new Map(holidayRows.map((h) => [h.holidayDate, h]));
  const holidayDates = new Set(
    holidayRows.filter((h) => h.type === "Holiday").map((h) => h.holidayDate)
  );
  const weekOffDates = new Set(
    holidayRows.filter((h) => h.type === "Week Off").map((h) => h.holidayDate)
  );

  await BiometricPunch.destroy({
    where: {
      staffId: staffEmployee.staffId,
      punchDate: { [Op.between]: [startDate, endDate] },
    },
    force: true,
  });

  await Attendance.destroy({
    where: {
      staffId: staffEmployee.staffId,
      attendanceDate: { [Op.between]: [startDate, endDate] },
    },
    force: true,
  });

  const allDates = getEveryDate(startDate, endDate);
  const workingDays = allDates.filter(
    (d) => !holidayDates.has(d) && !weekOffDates.has(d)
  );

  const statusByDate = {};

  for (const d of allDates) {
    if (holidayDates.has(d)) {
      statusByDate[d] = "Holiday";
      continue;
    }
    if (weekOffDates.has(d)) {
      statusByDate[d] = "Week Off";
      continue;
    }
  }

  workingDays.forEach((d, idx) => {
    statusByDate[d] = baseStatusByIndex(idx + 1);
  });

  ensureAllRequiredStatuses(statusByDate, workingDays, holidayDates, weekOffDates);

  const scheduledStartDateTime = (dateOnly) => atTime(dateOnly, "09:00:00");
  const scheduledEndDateTime = (dateOnly) => atTime(dateOnly, "17:00:00");

  let punchRows = 0;
  let attendanceRows = 0;
  const statusCounts = {};

  for (const dateOnly of allDates) {
    const status = statusByDate[dateOnly];
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    const scheduledStart = scheduledStartDateTime(dateOnly);
    const scheduledEnd = scheduledEndDateTime(dateOnly);
    const holidayRow = holidayMap.get(dateOnly) || null;

    const punchTimes = getPunchTimesForStatus(status);
    let firstCheckIn = null;
    let lastCheckOut = null;
    let totalCheckIns = 0;
    let totalCheckOuts = 0;

    if (punchTimes) {
      firstCheckIn = atTime(dateOnly, punchTimes.inTime);
      lastCheckOut = atTime(dateOnly, punchTimes.outTime);

      await BiometricPunch.create({
        staffId: staffEmployee.staffId,
        biometricDeviceId: device.deviceId,
        biometricNumber: staffEmployee.biometricNumber,
        punchTimestamp: firstCheckIn,
        punchDate: dateOnly,
        punchType: "IN",
        isLate: firstCheckIn > atTime(dateOnly, "09:15:00"),
        isEarlyOut: false,
        isManual: false,
        status: "Valid",
        remarks: `Seeded ${status} day IN`,
        companyId: company.companyId,
        createdBy: adminUserId,
      });
      await BiometricPunch.create({
        staffId: staffEmployee.staffId,
        biometricDeviceId: device.deviceId,
        biometricNumber: staffEmployee.biometricNumber,
        punchTimestamp: lastCheckOut,
        punchDate: dateOnly,
        punchType: "OUT",
        isLate: false,
        isEarlyOut: lastCheckOut < atTime(dateOnly, "16:45:00"),
        isManual: false,
        status: "Valid",
        remarks: `Seeded ${status} day OUT`,
        companyId: company.companyId,
        createdBy: adminUserId,
      });
      totalCheckIns = 1;
      totalCheckOuts = 1;
      punchRows += 2;
    }

    const rawWorkingHours =
      firstCheckIn && lastCheckOut ? diffHours(firstCheckIn, lastCheckOut) : 0;
    const workingHours = Number(rawWorkingHours.toFixed(2));
    const scheduledHours = diffHours(scheduledStart, scheduledEnd);
    const overtimeHours = Math.max(0, Number((workingHours - scheduledHours).toFixed(2)));
    const isLate = firstCheckIn ? firstCheckIn > atTime(dateOnly, "09:15:00") : false;
    const lateByMinutes = isLate
      ? Math.max(
          0,
          Math.round((firstCheckIn.getTime() - atTime(dateOnly, "09:15:00").getTime()) / 60000)
        )
      : 0;
    const isEarlyExit = lastCheckOut
      ? lastCheckOut < atTime(dateOnly, "16:45:00")
      : false;
    const earlyExitMinutes = isEarlyExit
      ? Math.max(
          0,
          Math.round((atTime(dateOnly, "16:45:00").getTime() - lastCheckOut.getTime()) / 60000)
        )
      : 0;

    const remarks = [];
    if (status === "Permission") remarks.push("permUsedHours=1");
    if (status === "Leave") remarks.push("Approved leave (seed)");
    if (status === "Absent") remarks.push("No punches available");
    if (status === "Holiday") remarks.push(holidayRow?.description || "Public holiday");
    if (status === "Week Off") remarks.push("Sunday week off");

    await Attendance.create({
      staffId: staffEmployee.staffId,
      companyId: company.companyId,
      shiftAssignmentId: shiftAssignment.shiftAssignmentId,
      shiftTypeId: shiftType.shiftTypeId,
      attendanceDate: dateOnly,
      scheduledStartTime: "09:00:00",
      scheduledEndTime: "17:00:00",
      firstCheckIn,
      lastCheckOut,
      totalCheckIns,
      totalCheckOuts,
      workingHours,
      breakHours: 0,
      overtimeHours,
      attendanceStatus: status,
      isLate,
      lateByMinutes,
      isEarlyExit,
      earlyExitMinutes,
      isHoliday: status === "Holiday",
      isWeekOff: status === "Week Off",
      autoGenerated: true,
      remarks: remarks.join("; "),
      approvedBy: adminUserId,
      approvedAt: new Date(),
      createdBy: adminUserId,
      updatedBy: adminUserId,
    });
    attendanceRows += 1;
  }

  return {
    staffId: staffEmployee.staffId,
    userId: staffUser.userId,
    userMail: staffUser.userMail,
    dateFrom: startDate,
    dateTo: endDate,
    punchRows,
    attendanceRows,
    statusCounts,
  };
}

async function main() {
  const { startDate, endDate } = getPast60DayRange();

  const masterData = await seedMasters();
  const { company, shiftType, device } = masterData;
  const { users, employees, adminUser } = await seedUsersAndEmployees(masterData);

  const staffUser = users["2312077@nec.edu.in"];
  const staffEmployee = employees["2312077@nec.edu.in"];
  if (!staffUser || !staffEmployee) {
    throw new Error("Staff user/employee (2312077@nec.edu.in) not found after seeding.");
  }

  let shiftAssignment = await ShiftAssignment.findOne({
    where: { staffId: staffEmployee.staffId },
    paranoid: false,
  });
  if (!shiftAssignment) {
      shiftAssignment = await ShiftAssignment.create({
        staffId: staffEmployee.staffId,
        shiftTypeId: shiftType.shiftTypeId,
        startDate,
        endDate,
      isRecurring: true,
      recurringPattern: "weekly",
      recurringDays: [1, 2, 3, 4, 5, 6],
      status: "Active",
      notes: "Default seeded shift assignment",
      companyId: company.companyId,
      createdBy: adminUser.userId,
      updatedBy: adminUser.userId,
    });
  } else {
    if (shiftAssignment.deletedAt) {
      await shiftAssignment.restore();
    }
    await shiftAssignment.update({
      shiftTypeId: shiftType.shiftTypeId,
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

  const { holidayPlan, holidayRows } = await ensureHolidayData({
    companyId: company.companyId,
    createdBy: adminUser.userId,
    startDate,
    endDate,
  });

  const attendanceSeedResult = await seedAttendanceAndPunchesForStaff({
    staffEmployee,
    staffUser,
    company,
    shiftType,
    shiftAssignment,
    device,
    holidayRows,
    startDate,
    endDate,
    adminUserId: adminUser.userId,
  });

  console.log("Initial master + user + attendance seed completed.");
  console.log(
    JSON.stringify(
      {
        company: {
          companyId: company.companyId,
          companyName: company.companyName,
          companyAcr: company.companyAcr,
        },
        roles: ["Super Admin", "Staff"],
        departments: ["cse", "ece", "mech", "civil", "eee", "it", "aids", "admin"],
        users: [
          {
            userId: users["2312077@nec.edu.in"]?.userId,
            userMail: "2312077@nec.edu.in",
            role: "Staff",
          },
          {
            userId: users["2312078@nec.edu.in"]?.userId,
            userMail: "2312078@nec.edu.in",
            role: "Super Admin",
          },
          {
            userId: users["2312080@nec.edu.in"]?.userId,
            userMail: "2312080@nec.edu.in",
            role: "Super Admin",
          },
          {
            userId: users["s.praveenkumar.offl@gmail.com"]?.userId,
            userMail: "s.praveenkumar.offl@gmail.com",
            role: "Super Admin",
          },
        ],
        holidayPlanId: holidayPlan.holidayPlanId,
        shiftTypeId: shiftType.shiftTypeId,
        shiftAssignmentId: shiftAssignment.shiftAssignmentId,
        deviceId: device.deviceId,
        attendanceSeedResult,
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
