const LeaveAllocation = require("../models/LeaveAllocation");

// ✅ Create
// Create (single + bulk)
exports.createLeaveAllocation = async (req, res) => {
  try {
    const data = req.body; // could be object or array

    if (Array.isArray(data)) {
      // Bulk insert
      const allocations = await LeaveAllocation.bulkCreate(data, { returning: true });
      return res.status(201).json(allocations);
    } else {
      // Single insert
      const allocation = await LeaveAllocation.create(data);
      return res.status(201).json(allocation);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ✅ Get all
// GET /api/leaveAllocations?leaveTypeId=2&period=2025
exports.getAllLeaveAllocations = async (req, res) => {
  try {
    const { leaveTypeId, leavePeriod } = req.query;
    const where = {};
    if (leaveTypeId) where.leaveTypeId = leaveTypeId;
    if (leavePeriod) where.leavePeriod = leavePeriod;

    const allocations = await LeaveAllocation.findAll({ where });
    res.json(allocations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ✅ Get by ID
exports.getLeaveAllocationById = async (req, res) => {
  try {
    const {leaveTypeId} = req.params;
    console.log(leaveTypeId);    
    const allocation = await LeaveAllocation.findAll({where:{leaveTypeId}});
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
