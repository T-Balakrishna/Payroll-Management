const LeaveAllocation = require("../models/LeaveAllocation");

// ✅ Create
// Create (single + bulk)
exports.createLeaveAllocation = async (req, res) => {
  try {
    let data = req.body; // could be object or array

    const normalize = (obj) => {
      const { startYear, endYear, ...rest } = obj;

      // ensure endYear = startYear + 1
      console.log(startYear+" "+endYear);      
      if (Number(endYear) !== Number(startYear) + 1) {
        throw new Error(`❌ Invalid period: endYear must be startYear + 1`);
      }     
      return {
        ...rest,
        leavePeriod: `${startYear}-${endYear}`,
        startDate: `${startYear}-06-01`,
        endDate: `${endYear}-04-30`,
      };
    };

    if (Array.isArray(data)) {
      const prepared = data.map(normalize);
      const allocations = await LeaveAllocation.bulkCreate(prepared, { returning: true });
      return res.status(201).json(allocations);
    } else {
      const prepared = normalize(data);
      const allocation = await LeaveAllocation.create(prepared);
      return res.status(201).json(allocation);
    }
  } catch (error) {
    console.error("❌ Error creating leave allocation:", error);
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
    const { employeeNumber, leaveTypeId, leavePeriod, allotedLeave, usedLeave, updatedBy } = req.body;

    // find the record by employeeNumber + leaveTypeId + leavePeriod
    let allocation = await LeaveAllocation.findOne({
      where: { employeeNumber, leaveTypeId, leavePeriod }
    });

    if (!allocation) {
      // if not found, optionally create a new one
      allocation = await LeaveAllocation.create({
        employeeNumber,
        leaveTypeId,
        leavePeriod,
        allotedLeave,
        usedLeave: usedLeave || 0,
        createdBy: updatedBy
      });
      return res.status(201).json(allocation);
    }

    // update existing
    allocation.allotedLeave = allotedLeave ?? allocation.allotedLeave;
    allocation.usedLeave = usedLeave ?? allocation.usedLeave;
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
