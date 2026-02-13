/* eslint-disable no-console */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const db = require("../models");
const { sequelize, Attendance, Employee } = db;
const { Op } = db.Sequelize;

const parseMonthArg = (arg) => {
  if (!arg || !/^\d{4}-\d{2}$/.test(arg)) {
    throw new Error("month must be in YYYY-MM format");
  }
  const [y, m] = arg.split("-").map(Number);
  return { year: y, month: m };
};

const toDateOnly = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

async function main() {
  const monthArg = process.argv[2];
  const companyId = process.argv[3];
  const staffId = process.argv[4];

  if (!monthArg || !companyId) {
    throw new Error(
      "Usage: node backend/scripts/verify_attendance_month.js YYYY-MM <companyId> [staffId]"
    );
  }

  const { year, month } = parseMonthArg(monthArg);
  const start = toDateOnly(new Date(year, month - 1, 1));
  const end = toDateOnly(new Date(year, month, 0));

  const where = {
    companyId,
    attendanceDate: { [Op.between]: [start, end] },
  };
  if (staffId) where.staffId = staffId;

  const rows = await Attendance.findAll({
    where,
    order: [
      ["attendanceDate", "ASC"],
      ["staffId", "ASC"],
    ],
  });

  console.log(`Attendance rows: ${rows.length}`);

  const summary = {};
  for (const r of rows) {
    summary[r.attendanceStatus] = (summary[r.attendanceStatus] || 0) + 1;
  }
  console.log("Status Summary:", summary);

  const preview = rows.slice(0, 20).map((r) => ({
    date: r.attendanceDate,
    staffId: r.staffId,
    status: r.attendanceStatus,
    workingHours: r.workingHours,
    in: r.firstCheckIn,
    out: r.lastCheckOut,
    late: r.isLate,
    earlyExit: r.isEarlyExit,
    remarks: r.remarks,
  }));
  console.table(preview);

  if (staffId) {
    const emp = await Employee.findByPk(staffId, {
      attributes: ["staffId", "staffNumber", "remainingPermissionHours"],
    });
    if (emp) {
      console.log("Employee Permission Balance:", {
        staffId: emp.staffId,
        staffNumber: emp.staffNumber,
        remainingPermissionHours: emp.remainingPermissionHours,
      });
    }
  }

  await sequelize.close();
}

main().catch(async (err) => {
  console.error("Verify failed:", err.message);
  try {
    await sequelize.close();
  } catch {}
  process.exit(1);
});
