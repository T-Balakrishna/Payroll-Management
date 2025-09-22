const Leave = require('../models/Leave');
const LeaveType = require('../models/LeaveType');
const Employee = require('../models/Employee');
const sequelize = require('../config/db');

// Apply Leave
exports.applyLeave = async (req, res) => {
  try {
    const { employeeId, leaveTypeId, startDate, endDate, reason, createdBy } = req.body;

    const employee = await Employee.findByPk(employeeId);
    if (!employee) return res.status(404).send("Employee not found");

    // Calculate requested days
    const requestedDays = (new Date(endDate) - new Date(startDate)) / (1000*60*60*24) + 1;

    // TODO: plug in leave policy validation if needed

    const newLeave = await Leave.create({
      employeeId,
      leaveTypeId,
      startDate,
      endDate,
      reason,
      createdBy
    });

    res.status(201).json(newLeave);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error applying leave: " + error.message);
  }
};

// Get all leave requests for an employee
exports.getLeavesByEmployee = async (req, res) => {
  try {
    const leaves = await Leave.findAll({
      where: { employeeId: req.params.id },
      include: [LeaveType, Employee]
    });
    res.json(leaves);
  } catch (error) {
    res.status(500).send("Error fetching leaves: " + error.message);
  }
};

// Approve / Reject leave
exports.updateLeaveStatus = async (req, res) => {
  try {
    const leave = await Leave.findByPk(req.params.id);
    if (!leave) return res.status(404).send("Leave request not found");

    await leave.update({ status: req.body.status, updatedBy: req.body.updatedBy });
    res.json(leave);
  } catch (error) {
    res.status(500).send("Error updating leave status: " + error.message);
  }
};

// Get all pending leave requests
exports.getPendingLeaveRequests = async (req, res) => {
  try {
    const pendingLeaves = await Leave.findAll({
      where: { status: 'Pending' },
      include: [
        { model: Employee, attributes: ['employeeName', 'employeeId'] },
        { model: LeaveType, attributes: ['leaveTypeName'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(pendingLeaves);
  } catch (error) {
    res.status(500).send("Error fetching pending leave requests: " + error.message);
  }
};
