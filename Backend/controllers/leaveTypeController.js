const LeaveType = require('../models/LeaveType'); // Sequelize model

// Create
exports.createLeaveType = async (req, res) => {
  try {
    const {
      leaveTypeName,
      maxAllocationPerPeriod,
      allowApplicationAfterDays,
      minWorkingDaysForLeave,
      maxConsecutiveLeaves,
      isCarryForward,
      isLeaveWithoutPay,
      isPartiallyPaidLeave,
      isOptionalLeave,
      allowNegativeBalance,
      allowOverAllocation,
      includeHolidaysAsLeave,
      isCompensatory,
      allowEncashment,
      isEarnedLeave,
      createdBy
    } = req.body;

    const newLeaveType = await LeaveType.create({
      leaveTypeName,
      maxAllocationPerPeriod,
      allowApplicationAfterDays,
      minWorkingDaysForLeave,
      maxConsecutiveLeaves,
      isCarryForward,
      isLeaveWithoutPay,
      isPartiallyPaidLeave,
      isOptionalLeave,
      allowNegativeBalance,
      allowOverAllocation,
      includeHolidaysAsLeave,
      isCompensatory,
      allowEncashment,
      isEarnedLeave,
      createdBy
    });

    res.status(201).json(newLeaveType);
  } catch (error) {
    console.error("❌ Error creating leave type:", error);
    res.status(500).send("Error creating leave type: " + error.message);
  }
};

// Read All (only active)
exports.getAllLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = await LeaveType.findAll({ where: { status: 'active' } });
    res.json(leaveTypes);
  } catch (error) {
    res.status(500).send("Error fetching leave types: " + error.message);
  }
};

// Read One by ID (only active)
exports.getLeaveTypeById = async (req, res) => {
  try {
    const leaveType = await LeaveType.findOne({ where: { leaveTypeId: req.params.id, status: 'active' } });
    if (!leaveType) return res.status(404).send("Leave type not found or inactive");
    res.json(leaveType);
  } catch (error) {
    res.status(500).send("Error fetching leave type: " + error.message);
  }
};

// Update
exports.updateLeaveType = async (req, res) => {
  try {
    const leaveType = await LeaveType.findOne({ where: { leaveTypeId: req.params.id, status: 'active' } });
    if (!leaveType) return res.status(404).send("Leave type not found or inactive");

    await leaveType.update({ ...req.body, updatedBy: req.body.updatedBy });
    res.json(leaveType);
  } catch (error) {
    console.error("❌ Error updating leave type:", error);
    res.status(500).send("Error updating leave type: " + error.message);
  }
};

// Soft Delete (set status to inactive)
exports.deleteLeaveType = async (req, res) => {
  try {
    const leaveType = await LeaveType.findOne({ where: { leaveTypeId: req.params.id, status: 'active' } });
    if (!leaveType) return res.status(404).send("Leave type not found or already inactive");

    await leaveType.update({ status: 'inactive', updatedBy: req.body.updatedBy });
    res.json({ message: "Leave type deactivated successfully" });
  } catch (error) {
    res.status(500).send("Error deleting leave type: " + error.message);
  }
};
