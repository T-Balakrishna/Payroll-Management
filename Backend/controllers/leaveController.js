// controllers/leaveController.js
const dayjs = require("dayjs");
const Leave = require("../models/Leave");
const LeaveAllocation = require("../models/LeaveAllocation");
const Employee = require('../models/Employee')

// helper: calculate leavePeriod
const getLeavePeriod = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  return month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};


function calculateLeaveDays(startDate, endDate) {
  return dayjs(endDate).diff(dayjs(startDate), "day") + 1;
}

// Employee apply leave
exports.applyLeave = async (req, res) => {
  try {
    const { employeeNumber, leaveTypeId, startDate, endDate, reason, companyId, departmentId } = req.body;

    const requestedDays = calculateLeaveDays(startDate, endDate);

    // Determine leavePeriod
    const currentYear = dayjs(startDate).year();
    const month = dayjs(startDate).month() + 1;
    const leavePeriod = month >= 6 
      ? `${currentYear}-${currentYear + 1}` 
      : `${currentYear - 1}-${currentYear}`;

    // Find allocation
    const allocation = await LeaveAllocation.findOne({
      where: { employeeNumber, leaveTypeId, leavePeriod }
    });

    if (!allocation || allocation.balance < requestedDays) {
      return res.status(400).json({ message: "Insufficient leave balance" });
    }

    // Deduct balance instantly
    await allocation.update({
      usedLeave: allocation.usedLeave + requestedDays,
      balance: allocation.balance - requestedDays
    });

    // Save leave application
    const leave = await Leave.create({
      employeeNumber,
      leaveTypeId,
      startDate,
      endDate,
      reason,
      status: "Pending",
      createdBy: employeeNumber,
      companyId,
      departmentId
    });

    res.status(201).json({ message: "Leave applied successfully", leave });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin get all leaves
exports.getAllLeaves = async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};
    const leaves = await Leave.findAll({
      where,
      order: [["createdAt", "DESC"]]
    });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin approve/reject
exports.updateLeaveStatus = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { status, updatedBy } = req.body;

    const leave = await Leave.findByPk(leaveId);
    if (!leave) return res.status(404).json({ message: "Leave not found" });

    const leavePeriod = getLeavePeriod(leave.startDate);
    const requestedDays = calculateLeaveDays(leave.startDate, leave.endDate);

    // Find allocation
    const allocation = await LeaveAllocation.findOne({
      where: {
        employeeNumber: leave.employeeNumber,
        leaveTypeId: leave.leaveTypeId,
        leavePeriod
      }
    });

    if (status === "Rejected" && allocation) {
      // Revert the deduction
      await allocation.update({
        usedLeave: allocation.usedLeave - requestedDays,
        balance: allocation.balance + requestedDays,
        updatedBy
      });
    }

    // For Approved: Do nothing (since already adjusted on apply)

    leave.status = status;
    leave.updatedBy = updatedBy;
    await leave.save();

    res.json({ message: `Leave ${status} successfully` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getLeavesByStatus = async (req, res) => {
  try {
    const status = req.params.status || 'all'; // 'pending', 'approved', 'rejected', 'all'
    let whereClause = {};
    if (status !== 'all') whereClause.status = status;

    const leaves = await Leave.findAll({
      where: whereClause,      
      order: [['createdAt', 'DESC']],
    });

    // Map employee name
    const formattedLeaves = leaves.map((leave) => ({
      leaveId: leave.leaveId,
      leaveTypeId: leave.leaveTypeId,
      employeeNumber: leave.employeeNumber,
      startDate: leave.startDate,
      endDate: leave.endDate,
      reason: leave.reason,
      status: leave.status,
      companyId:leave.companyId,
      departmentId:leave.departmentId,
    }));



    res.json(formattedLeaves);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch leaves.' });
  }
};
// Employee: Get leaves for specific employee
exports.getLeavesByEmployee = async (req, res) => {
  try {
    const { employeeNumber } = req.params;
    const leaves = await Leave.findAll({
      where: { employeeNumber },
      order: [["createdAt", "DESC"]],
    });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};