const { Op } = require("sequelize");
const Attendance = require("../models/Attendance");
const Punch = require("../models/Punch");      // use Punch table
const Employee = require("../models/Employee");
const Shift = require("../models/Shift");

async function processAttendance() {
  try {
    const today = new Date().toISOString().split("T")[0];

    // ✅ Fetch all punches for today based on punchTimestamp
    const punches = await Punch.findAll({
      include: [
        { model: Employee, include: [{ model: Shift, as: "shift" }] },
      ],
      where: {
        punchTimestamp: {
          [Op.gte]: new Date(`${today}T00:00:00`),
          [Op.lte]: new Date(`${today}T23:59:59`)
        }
      },
      order: [
        ["employeeNumber", "ASC"],
        ["punchTimestamp", "ASC"]
      ],
    });

    // Group punches by employee
    const grouped = {};
    punches.forEach((p) => {
      const empNum = p.employeeNumber;
      if (!grouped[empNum]) grouped[empNum] = [];
      grouped[empNum].push(p);
    });

    // Process each employee
    for (const empNum in grouped) {
      const empPunches = grouped[empNum];
      const firstPunch = empPunches[0].punchTimestamp;
      const lastPunch = empPunches[empPunches.length - 1].punchTimestamp;

      const employee = await Employee.findOne({
        where: { employeeNumber: empNum },
        include: [{ model: Shift, as: "shift" }],
      });

      if (!employee || !employee.shift) continue;

      const shift = employee.shift;
      const shiftInEnd = new Date(`${today}T${shift.shiftInEndTime}`);
      const shiftOutStart = new Date(`${today}T${shift.shiftOutStartTime}`);

      let workedHours = (lastPunch - firstPunch) / 1000 / 3600;
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
