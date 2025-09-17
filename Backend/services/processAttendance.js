const { Op } = require("sequelize");
const Attendance = require("../models/Attendance");
const Biometric = require("../models/Biometric");
const Employee = require("../models/Employee");
const Shift = require("../models/Shift");

// Daily attendance processor
async function processAttendance() {
  try {
    const today = new Date().toISOString().split("T")[0];

    // ✅ Fetch all biometric punches for today with proper alias for shift
    const biometrics = await Biometric.findAll({
      include: [
        {
          model: Employee,
          include: [{ model: Shift, as: "shift" }], // ✅ fixed alias
        },
      ],
      where: {
        createdAt: {
          [Op.gte]: new Date(`${today}T00:00:00`),
        },
      },
      order: [
        ["employeeNumber", "ASC"],
        ["createdAt", "ASC"],
      ],
    });

    // Group punches by employee
    const grouped = {};
    biometrics.forEach((b) => {
      const empNum = b.employeeNumber;
      if (!grouped[empNum]) grouped[empNum] = [];
      grouped[empNum].push(b);
    });

    // Process each employee
    for (const empNum in grouped) {
      const punches = grouped[empNum];
      const firstPunch = punches[0].createdAt;
      const lastPunch = punches[punches.length - 1].createdAt;

      // ✅ fetch employee with shift alias
      const employee = await Employee.findOne({
        where: { employeeNumber: empNum },
        include: [{ model: Shift, as: "shift" }], // ✅ fixed alias
      });

      if (!employee || !employee.shift) continue;

      const shift = employee.shift;
      const shiftInEnd = new Date(`${today}T${shift.shiftInEndTime}`);
      const shiftOutStart = new Date(`${today}T${shift.shiftOutStartTime}`);

      let workedHours = (lastPunch - firstPunch) / 1000 / 3600;
      let status = "Absent";

      // Determine attendance status
      if (
        firstPunch <= shiftInEnd &&
        lastPunch >= shiftOutStart &&
        workedHours >= shift.shiftMinHours
      ) {
        status = "Present";
      } else if (workedHours >= shift.shiftMinHours * 0.5) {
        status = "Half-Day";
      }

      // Save attendance
      await Attendance.create({
        employeeId: employee.employeeId,
        attendanceDate: today,
        attendanceStatus: status,
      });

      console.log(`✅ ${employee.employeeName}: ${status}`);
    }

    console.log("🎯 Attendance processing completed!");
  } catch (err) {
    console.error("❌ Error processing attendance:", err);
  }
}

module.exports = processAttendance;
