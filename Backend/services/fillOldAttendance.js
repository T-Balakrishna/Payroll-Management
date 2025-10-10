// fillOldAttendance.js

const path = require("path");
require('dotenv').config({
  path: path.resolve(__dirname, "../.env"),
  debug: true
});

const seq = require("../config/db");
const db = require("../models");
const { Employee, Punch, Attendance, Shift } = db;

(async () => {
  try {
    console.log("🕐 Connecting to database...");
    await seq.authenticate();
    console.log("✅ Database connected!");

    // Ensure models + associations are ready
    await seq.sync({ alter: false, logging: false });
    console.log("✅ Tables synced, associations ready!");

    console.log("🕐 Fetching punches...");
    const punches = await Punch.findAll({
      include: [
        {
          model: Employee,
          as: "employee",
          include: [{ model: Shift, as: "shift" }]
        }
      ],
      order: [["punchTimestamp", "ASC"]],
    });

    if (!punches.length) {
      console.log("⚠️ No punches found.");
      process.exit(0);
    }

    // Group punches by biometricNumber + date
    const grouped = {};
    punches.forEach(p => {
      const empNum = p.biometricNumber;
      const date = p.punchTimestamp.toISOString().split("T")[0];
      const key = `${empNum}_${date}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(p);
    });

    console.log(`🗂️ Found ${Object.keys(grouped).length} employee-date groups.`);

    // Process each group
    for (const key in grouped) {
      const empPunches = grouped[key];

      // ✅ Correctly log punches
    //   console.log(key + " --->>> ", empPunches.map(p => ({
    //     punchTimestamp: p.punchTimestamp,
    //     deviceIp: p.deviceIp,
    //     biometricNumber: p.biometricNumber,
    //     employeeName: p.employee?.employeeName
    //   })));

      const employee = empPunches[0].employee; // Already included

      if (!employee || !employee.shift) continue;
      const shift = employee.shift;

      const date = empPunches[0].punchTimestamp.toISOString().split("T")[0];
      const firstPunch = empPunches[0].punchTimestamp;
      const lastPunch = empPunches[empPunches.length - 1].punchTimestamp;

      const shiftInEnd = new Date(`${date}T${shift.shiftInEndTime}`);
      const shiftOutStart = new Date(`${date}T${shift.shiftOutStartTime}`);
      const workedHours = (lastPunch - firstPunch) / 1000 / 3600;

      let status = "Absent";
      if (
        firstPunch <= shiftInEnd &&
        lastPunch >= shiftOutStart &&
        workedHours >= shift.shiftMinHours
      ) {
        status = "Present";
      } else if (workedHours >= shift.shiftMinHours * 0.5) {
        status = "Half-Day";
      }

      // Skip if attendance already exists
      const exists = await Attendance.findOne({
        where: { employeeNumber: employee.employeeNumber, attendanceDate: date },
      });
      if (exists) continue;

      // Create attendance
      await Attendance.create({
        employeeNumber: employee.employeeNumber,
        attendanceDate: date,
        attendanceStatus: status,
        companyId: employee.companyId
      });

      console.log(`✅ ${employee.employeeName} (${date}): ${status}`);
    }

    console.log("🎯 Old attendance processing completed!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error processing old attendance:", err);
    process.exit(1);
  }
})();
