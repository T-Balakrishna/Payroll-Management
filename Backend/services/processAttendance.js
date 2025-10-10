const { Op } = require("sequelize");
const Attendance = require("../models/Attendance");
const Punch = require("../models/Punch");
const Employee = require("../models/Employee");
const Shift = require("../models/Shift");
const Holiday = require("../models/Holiday");
const Leave = require("../models/Leave");
const Permission = require("../models/Permission");

async function processAttendance() {
  try {
    const today = new Date().toISOString().split("T")[0];

    const punches = await Punch.findAll({
      include: [{ model: Employee, as: 'employee' }],
      where: {
        punchTimestamp: {
          [Op.gte]: new Date(`${today}T00:00:00`),
          [Op.lte]: new Date(`${today}T23:59:59`)
        }
      },
      order: [["punchTimestamp", "ASC"]],
    });

    // Pre-fetch holidays and leaves for today
    const holidayToday = await Holiday.findOne({ where: { date: today } });
    const leavesToday = await Leave.findAll({
      where: {
        status: 'Approved',
        startDate: { [Op.lte]: today },
        endDate: { [Op.gte]: today }
      }
    });
    const leaveMap = {};
    leavesToday.forEach(l => leaveMap[l.employeeNumber] = true);

    const grouped = {};
    punches.forEach((p) => {
      const empNum = p.employeeNumber;
      if (!grouped[empNum]) grouped[empNum] = [];
      grouped[empNum].push(p);
    });

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
      let workedHours = (lastPunch - firstPunch) / 1000 / 3600;
      let status = "Absent";
      let permissionUsed = 0;

      // ------------------ Permission deduction ------------------
      const remainingPermission = employee.remainingPermissionHours || 0;

      if (workedHours >= shift.shiftMinHours) {
        status = "Present";
      } else if (workedHours >= shift.shiftMinHours - 1) {
        if (remainingPermission >= 1) {
          permissionUsed = 1;
          employee.remainingPermissionHours -= 1;
          status = "Present";
        } else if (workedHours >= shift.shiftMinHours / 2) {
          status = "Half-Day";
        }
      } else if (workedHours >= shift.shiftMinHours - 2) {
        if (remainingPermission >= 2) {
          permissionUsed = 2;
          employee.remainingPermissionHours -= 2;
          status = "Present";
        } else if (workedHours >= shift.shiftMinHours / 2) {
          status = "Half-Day";
        }
      } else if (workedHours >= shift.shiftMinHours / 2) {
        status = "Half-Day";
      }

      await employee.save(); // update remainingPermissionHours

      // ------------------ Holiday & Leave check ------------------
      if (status === "Absent") {
        if (holidayToday) {
          status = "Holiday";
        } else if (leaveMap[empNum]) {
          status = "Leave";
        }
      }

      // ------------------ Save attendance ------------------
      await Attendance.create({
        employeeId: employee.employeeId,
        attendanceDate: today,
        attendanceStatus: status,
        companyId:employee.companyId,
      });

      // ------------------ Log permission usage ------------------
      if (permissionUsed > 0) {
        await Permission.create({
          employeeNumber: empNum,
          permissionDate: today,
          permissionHours: permissionUsed,
          remainingHours: employee.remainingPermissionHours,
          companyId: employee.companyId,
        });
      }

      console.log(`✅ ${employee.employeeName}: ${status} (Permission used: ${permissionUsed}h)`);
    }

    console.log("🎯 Attendance processing completed!");
  } catch (err) {
    console.error("❌ Error processing attendance:", err);
  }
}

module.exports = processAttendance;
