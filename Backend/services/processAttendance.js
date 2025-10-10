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

    // ✅ Fetch all employees
    const employees = await Employee.findAll({
      include: [{ model: Shift, as: "shift" }],
    });

    // ✅ Fetch all today's punches
    const punches = await Punch.findAll({
      where: {
        punchTimestamp: {
          [Op.gte]: new Date(`${today}T00:00:00`),
          [Op.lte]: new Date(`${today}T23:59:59`)
        }
      },
      order: [["punchTimestamp", "ASC"]],
    });

    // Group punches by employee
    const grouped = {};
    punches.forEach((p) => {
      const empNum = p.employeeNumber;
      if (!grouped[empNum]) grouped[empNum] = [];
      grouped[empNum].push(p);
    });

    // ✅ Process all employees — even if no punches
    for (const employee of employees) {
      const empNum = employee.employeeNumber;
      const empPunches = grouped[empNum] || [];
      let status = "Absent";
      let usedPermission = 0;
      let workedHours = 0;

      // Step 1️⃣ Holiday check
      const isHoliday = await Holiday.findOne({
        where: { date: today, companyId: employee.companyId },
      });
      if (isHoliday) {
        status = "Holiday";
      } 
      else {
        // Step 2️⃣ Leave check
        const leave = await Leave.findOne({
          where: {
            employeeNumber: empNum,
            fromDate: { [Op.lte]: today },
            toDate: { [Op.gte]: today },
            status: "Approved"
          },
        });
        if (leave) {
          status = "Leave";
        } 
        else if (empPunches.length > 0) {
          // Step 3️⃣ Attendance + Permission Logic
          const firstPunch = empPunches[0].punchTimestamp;
          const lastPunch = empPunches[empPunches.length - 1].punchTimestamp;
          const shift = employee.shift;
          const minHours = shift?.shiftMinHours || 6.5;
          const remPerm = employee.remainingPermissionHours || 0;

          const shiftInEnd = new Date(`${today}T${shift?.shiftInEndTime || "10:00:00"}`);
          const shiftOutStart = new Date(`${today}T${shift?.shiftOutStartTime || "17:00:00"}`);

          workedHours = (lastPunch - firstPunch) / 1000 / 3600;

          if (firstPunch <= shiftInEnd && lastPunch >= shiftOutStart && workedHours >= minHours) {
            status = "Present";
          } 
          else if (workedHours >= minHours - 0.5) {
            status = "Present";
          } 
          else if (workedHours >= minHours - 1 && remPerm >= 1) {
            status = "Present";
            usedPermission = 1;
          } 
          else if (workedHours >= minHours - 2 && remPerm >= 2) {
            status = "Present";
            usedPermission = 2;
          } 
          else if (workedHours >= minHours / 2) {
            status = "Half-Day";
          } 
          else {
            status = "Absent";
          }
        }
      }

      // Step 4️⃣ Save Attendance
      await Attendance.create({
        employeeId: employee.employeeId,
        attendanceDate: today,
        attendanceStatus: status,
      });

      // Step 5️⃣ Permission Update
      if (usedPermission > 0) {
        employee.remainingPermissionHours -= usedPermission;
        await employee.save();

        await Permission.create({
          employeeNumber: empNum,
          permissionDate: today,
          permissionHours: usedPermission,
          remainingHours: employee.remainingPermissionHours,
          companyId: employee.companyId,
          createdBy: "System",
        });
      }

      console.log(
        `✅ ${employee.employeeName}: ${status} (${workedHours.toFixed(2)} hrs)`
      );
    }

    console.log("🎯 Attendance processing completed!");
  } catch (err) {
    console.error("❌ Error processing attendance:", err);
  }
}

module.exports = processAttendance;
