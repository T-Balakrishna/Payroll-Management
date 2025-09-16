const LeaveAllocation = require("../models/LeaveAllocation");

// ✅ Create
exports.createLeaveAllocation = async (req, res) => {
  try {
    const { employeeId, leavePeriod, leaveTypeId, allotedLeave, usedLeave, createdBy } = req.body;

    const allocation = await LeaveAllocation.create({
      employeeId,
      leavePeriod,
      leaveTypeId,
      allotedLeave,
      usedLeave,
      createdBy,
      updatedBy: createdBy,
    });

    res.status(201).json(allocation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Get all
exports.getAllLeaveAllocations = async (req, res) => {
  try {
    const allocations = await LeaveAllocation.findAll();
    res.json(allocations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Get by ID
exports.getLeaveAllocationById = async (req, res) => {
  try {
    const allocation = await LeaveAllocation.findByPk(req.params.id);
    if (!allocation) return res.status(404).json({ error: "Not found" });
    res.json(allocation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Update
exports.updateLeaveAllocation = async (req, res) => {
  try {
    const { allotedLeave, usedLeave, leavePeriod, leaveTypeId, updatedBy } = req.body;

    const allocation = await LeaveAllocation.findByPk(req.params.id);
    if (!allocation) return res.status(404).json({ error: "Not found" });

    allocation.allotedLeave = allotedLeave ?? allocation.allotedLeave;
    allocation.usedLeave = usedLeave ?? allocation.usedLeave;
    allocation.leavePeriod = leavePeriod ?? allocation.leavePeriod;
    allocation.leaveTypeId = leaveTypeId ?? allocation.leaveTypeId;
    allocation.updatedBy = updatedBy ?? allocation.updatedBy;

    await allocation.save();
    res.json(allocation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Delete
exports.deleteLeaveAllocation = async (req, res) => {
  try {
    const allocation = await LeaveAllocation.findByPk(req.params.id);
    if (!allocation) return res.status(404).json({ error: "Not found" });

    await allocation.destroy();
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
