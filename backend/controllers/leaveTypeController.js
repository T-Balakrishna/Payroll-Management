const { LeaveType } = require('../models');

// Get all leave types
// In real usage: almost always filtered by companyId
exports.getAllLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = await LeaveType.findAll({
      include: [
        { model: require('../models').Company, as: 'company' },
        // { model: require('../models').LeavePolicy, as: 'leavePolicies' },   // heavy — include only when needed
        // { model: require('../models').LeaveAllocation, as: 'allocations' }
        // { model: require('../models').LeaveRequest, as: 'requests' }
      ]
    });
    res.json(leaveTypes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single leave type by ID
exports.getLeaveTypeById = async (req, res) => {
  try {
    const leaveType = await LeaveType.findByPk(req.params.id, {
      include: [
        { model: require('../models').Company, as: 'company' },
      ]
    });

    if (!leaveType) {
      return res.status(404).json({ message: 'Leave type not found' });
    }

    res.json(leaveType);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new leave type
exports.createLeaveType = async (req, res) => {
  try {
    const leaveType = await LeaveType.create(req.body);
    res.status(201).json(leaveType);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update leave type
exports.updateLeaveType = async (req, res) => {
  try {
    const [updated] = await LeaveType.update(req.body, {
      where: { leaveTypeId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Leave type not found' });
    }

    const leaveType = await LeaveType.findByPk(req.params.id);
    res.json(leaveType);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete leave type (soft delete via paranoid: true)
exports.deleteLeaveType = async (req, res) => {
  try {
    const deleted = await LeaveType.destroy({
      where: { leaveTypeId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Leave type not found' });
    }

    res.json({ message: 'Leave type deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};