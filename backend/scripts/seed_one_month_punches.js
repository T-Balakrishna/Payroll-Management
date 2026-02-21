/* eslint-disable no-console */
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import db from "../models/index.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });
const {
  sequelize,
  Employee,
  Company,
  ShiftType,
  BiometricDevice,
  HolidayPlan,
  Holiday,
  BiometricPunch,
} = db;

const toDateOnly = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseMonthArg = (arg) => {
  if (!arg) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  const match = String(arg).match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    throw new Error("month must be in YYYY-MM format");
  }
  return { year: Number(match[1]), month: Number(match[2]) };
};

const atTime = (dateOnly, hhmmss) => new Date(`${dateOnly}T${hhmmss}`);
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

async function ensureShiftType(companyId) {
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
}

async function ensureHolidayPlan(companyId, monthStart, monthEnd) {
  let plan = await HolidayPlan.findOne({
    where: {
      companyId,
      holidayPlanName: `Seed Plan ${monthStart.slice(0, 7)}`,
    },
  });

  if (!plan) {
    plan = await HolidayPlan.create({
      holidayPlanName: `Seed Plan ${monthStart.slice(0, 7)}`,
      startDate: monthStart,
      endDate: monthEnd,
      companyId,
      status: "Active",
    });
  }

  return plan;
}

async function ensureDevice(companyId) {
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
}

async function ensureHoliday(companyId, holidayPlanId, monthStart, monthEnd) {
  const monthDate = new Date(`${monthStart}T00:00:00`);
  const holidayDate = toDateOnly(
    new Date(monthDate.getFullYear(), monthDate.getMonth(), 15)
  );

  if (holidayDate < monthStart || holidayDate > monthEnd) return;

  const exists = await Holiday.findOne({
    where: { companyId, holidayPlanId, holidayDate },
  });
  if (!exists) {
    await Holiday.create({
      holidayDate,
      description: "Seed Festival Holiday",
      type: "Holiday",
      holidayPlanId,
      companyId,
      status: "Active",
    });
  }
}

async function main() {
  const monthArg = process.argv[2]; // YYYY-MM (optional)
  const companyIdArg = process.argv[3]; // optional
  const staffIdArg = process.argv[4]; // optional
  const month = parseMonthArg(monthArg);

  const monthStartDate = new Date(month.year, month.month - 1, 1);
  const monthEndDate = new Date(month.year, month.month, 0);
  const monthStart = toDateOnly(monthStartDate);
  const monthEnd = toDateOnly(monthEndDate);

  const employee = staffIdArg
    ? await Employee.findByPk(staffIdArg)
    : await Employee.findOne({
        where: companyIdArg ? { companyId: companyIdArg } : {},
        order: [["staffId", "ASC"]],
      });

  if (!employee) {
    throw new Error("No staff found in staff_details. Create one staff first.");
  }

  const effectiveCompanyId = companyIdArg || employee.companyId;
  if (!effectiveCompanyId) {
    throw new Error("No companyId available. Pass companyId: node backend/scripts/seed_one_month_punches.js YYYY-MM <companyId> [staffId]");
  }

  const company = await Company.findByPk(effectiveCompanyId);
  if (!company) {
    throw new Error(`Company not found for companyId=${effectiveCompanyId}`);
  }

  if (!employee.companyId) {
    await employee.update({ companyId: company.companyId });
  }

  const shiftType = await ensureShiftType(company.companyId);
  const holidayPlan = await ensureHolidayPlan(company.companyId, monthStart, monthEnd);
  const device = await ensureDevice(company.companyId);

  await ensureHoliday(company.companyId, holidayPlan.holidayPlanId, monthStart, monthEnd);

  if (!employee.shiftTypeId) {
    await employee.update({ shiftTypeId: shiftType.shiftTypeId });
  }

  if (!employee.biometricNumber) {
    await employee.update({ biometricNumber: `BIO${employee.staffId}` });
  }

  const quota = Number(company.permissionHoursPerMonth || 0);
  if (!employee.remainingPermissionHours || Number(employee.remainingPermissionHours) === 0) {
    await employee.update({ remainingPermissionHours: quota });
  }

  // Clear existing punches for this month/staff for repeatable testing
  await BiometricPunch.destroy({
    where: {
      staffId: employee.staffId,
      punchDate: { [db.Sequelize.Op.between]: [monthStart, monthEnd] },
    },
    force: true,
  });

  // Mark holiday date (15th)
  const holidayDate = toDateOnly(new Date(month.year, month.month - 1, 15));

  let inserted = 0;
  const weeklyOffDays = normalizeWeeklyOffDays(shiftType?.weeklyOff);
  const weeklyOffIndexes = new Set(
    weeklyOffDays.map((name) => WEEKLY_OFF_DAY_INDEX[name]).filter((i) => Number.isInteger(i))
  );
  for (
    let d = new Date(monthStartDate);
    d <= monthEndDate;
    d.setDate(d.getDate() + 1)
  ) {
    const dateOnly = toDateOnly(d);
    const dow = d.getDay(); // 0=Sun

    // Shift weekly off and configured holiday => no punches
    if (weeklyOffIndexes.has(dow) || dateOnly === holidayDate) continue;

    const day = d.getDate();
    const pattern = day % 5;

    // pattern 0 => absent (no punch)
    if (pattern === 0) continue;

    let inTime = "09:00:00";
    let outTime = "17:00:00";

    if (pattern === 1) {
      // Full day on time
      inTime = "08:58:00";
      outTime = "17:05:00";
    } else if (pattern === 2) {
      // Late but full working
      inTime = "09:22:00";
      outTime = "17:10:00";
    } else if (pattern === 3) {
      // Short by ~1h => should consume permission quota
      inTime = "09:05:00";
      outTime = "14:55:00";
    } else if (pattern === 4) {
      // Half-day candidate
      inTime = "09:12:00";
      outTime = "12:45:00";
    }

    await BiometricPunch.create({
      staffId: employee.staffId,
      biometricDeviceId: device.deviceId,
      biometricNumber: employee.biometricNumber,
      punchTimestamp: atTime(dateOnly, inTime),
      punchDate: dateOnly,
      status: "Valid",
      companyId: company.companyId,
    });

    await BiometricPunch.create({
      staffId: employee.staffId,
      biometricDeviceId: device.deviceId,
      biometricNumber: employee.biometricNumber,
      punchTimestamp: atTime(dateOnly, outTime),
      punchDate: dateOnly,
      status: "Valid",
      companyId: company.companyId,
    });

    inserted += 2;
  }

  console.log("Seed complete");
  console.log({
    companyId: company.companyId,
    staffId: employee.staffId,
    monthStart,
    monthEnd,
    insertedPunchRows: inserted,
    deviceId: device.deviceId,
    shiftTypeId: shiftType.shiftTypeId,
    holidayPlanId: holidayPlan.holidayPlanId,
    permissionHoursPerMonth: company.permissionHoursPerMonth,
  });

  await sequelize.close();
}

main().catch(async (err) => {
  console.error("Seed failed:", err.message);
  try {
    await sequelize.close();
  } catch {}
  process.exit(1);
});
