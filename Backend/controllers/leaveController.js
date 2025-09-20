const LeaveRequest = require('../models/LeaveRequest');
const LeavePolicyDetails = require('../models/LeavePolicyDetails');
const Employee = require('../models/Employee');
const sequelize = require('../config/db');

// Apply Leave
exports.applyLeave = async (req, res) => {
  try {
    const { employeeId, leaveTypeId, startDate, endDate, reason, createdBy } = req.body;

    const employee = await Employee.findByPk(employeeId);
    if (!employee) return res.status(404).send("Employee not found");

    const policyId = employee.leavePolicyId;

    const policyDetail = await LeavePolicyDetails.findOne({
      where: { leavePolicyId: policyId, leaveTypeId }
    });
    if (!policyDetail) return res.status(400).send("Leave type not allowed for this employee");

    const usedLeaves = await LeaveRequest.sum(
      sequelize.literal("DATEDIFF(endDate, startDate)+1"),
      { where: { employeeId, leaveTypeId, status: 'Approved' } }
    ) || 0;

    const requestedDays = (new Date(endDate) - new Date(startDate)) / (1000*60*60*24) + 1;
    const remainingLeaves = policyDetail.allocatedLeaves - usedLeaves;

    if (requestedDays > remainingLeaves) 
      return res.status(400).send(`Not enough remaining leaves. Available: ${remainingLeaves}`);

    const newLeave = await LeaveRequest.create({
      employeeId,
      leavePolicyId: policyId,
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
    const leaves = await LeaveRequest.findAll({
      where: { employeeId: req.params.id },
      include: ['LeaveType', 'LeavePolicy']
    });
    res.json(leaves);
  } catch (error) {
    res.status(500).send("Error fetching leaves: " + error.message);
  }
};

// Approve / Reject leave
exports.updateLeaveStatus = async (req, res) => {
  try {
    const leave = await LeaveRequest.findByPk(req.params.id);
    if (!leave) return res.status(404).send("Leave request not found");

    await leave.update({ status: req.body.status, updatedBy: req.body.updatedBy });
    res.json(leave);
  } catch (error) {
    res.status(500).send("Error updating leave status: " + error.message);
  }
};

exports.getPendingLeaveRequests = async (req, res) => {
  try {
    const pendingLeaves = await LeaveRequest.findAll({
      where: { status: 'Pending' },
      include: [
        { model: Employee, attributes: ['employeeName', 'employeeId'] },
        { model: LeaveType, attributes: ['leaveTypeName'] },
        { model: LeavePolicy, attributes: ['policyName'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(pendingLeaves);
  } catch (error) {
    res.status(500).send("Error fetching pending leave requests: " + error.message);
  }
};
