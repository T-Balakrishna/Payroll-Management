const { LeaveAllocation } = require('../models');

// Get all leave allocations
// In real usage: always filter by companyId, employeeId, leavePeriodId, etc.
exports.getAllLeaveAllocations = async (req, res) => {
  try {
    const allocations = await LeaveAllocation.findAll({
      include: [
        { model: require('../models').Employee, as: 'employee' },
        { model: require('../models').LeaveType, as: 'leaveType' },
        { model: require('../models').LeavePolicy, as: 'leavePolicy' },
        { model: require('../models').Company, as: 'company' },
      ]
    });
    res.json(allocations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single leave allocation by ID
exports.getLeaveAllocationById = async (req, res) => {
  try {
    const allocation = await LeaveAllocation.findByPk(req.params.id, {
      include: [
        { model: require('../models').Employee, as: 'employee' },
        { model: require('../models').LeaveType, as: 'leaveType' },
        { model: require('../models').LeavePolicy, as: 'leavePolicy' },
        { model: require('../models').Company, as: 'company' },
      ]
    });

    if (!allocation) {
      return res.status(404).json({ message: 'Leave allocation not found' });
    }

    res.json(allocation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new leave allocation
exports.createLeaveAllocation = async (req, res) => {
  try {
    const allocation = await LeaveAllocation.create(req.body);
    res.status(201).json(allocation);
  } catch (error) {
    res.status(400).json({ error: error.message }); // better for validation
  }
};

// Update leave allocation
// (e.g. adjust usedLeaves, carry forward, status, etc.)
exports.updateLeaveAllocation = async (req, res) => {
  try {
    const [updated] = await LeaveAllocation.update(req.body, {
      where: { leaveAllocationId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Leave allocation not found' });
    }

    const allocation = await LeaveAllocation.findByPk(req.params.id);
    res.json(allocation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete leave allocation (soft delete via paranoid: true)
exports.deleteLeaveAllocation = async (req, res) => {
  try {
    const deleted = await LeaveAllocation.destroy({
      where: { leaveAllocationId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Leave allocation not found' });
    }

    res.json({ message: 'Leave allocation deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};