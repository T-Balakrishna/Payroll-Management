const { LeavePolicy } = require('../models');

// Get all leave policies
// In practice: almost always filtered by companyId
exports.getAllLeavePolicies = async (req, res) => {
  try {
    const leavePolicies = await LeavePolicy.findAll({
      include: [
        { model: require('../models').Company, as: 'company' },
        // { model: require('../models').LeaveAllocation, as: 'leaveAllocations' } // heavy — include only when needed
      ]
    });
    res.json(leavePolicies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single leave policy by ID
exports.getLeavePolicyById = async (req, res) => {
  try {
    const leavePolicy = await LeavePolicy.findByPk(req.params.id, {
      include: [
        { model: require('../models').Company, as: 'company' },
      ]
    });

    if (!leavePolicy) {
      return res.status(404).json({ message: 'Leave policy not found' });
    }

    res.json(leavePolicy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new leave policy
exports.createLeavePolicy = async (req, res) => {
  try {
    const leavePolicy = await LeavePolicy.create(req.body);
    res.status(201).json(leavePolicy);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update leave policy
exports.updateLeavePolicy = async (req, res) => {
  try {
    const [updated] = await LeavePolicy.update(req.body, {
      where: { leavePolicyId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Leave policy not found' });
    }

    const leavePolicy = await LeavePolicy.findByPk(req.params.id);
    res.json(leavePolicy);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete leave policy (soft delete via paranoid: true)
exports.deleteLeavePolicy = async (req, res) => {
  try {
    const deleted = await LeavePolicy.destroy({
      where: { leavePolicyId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Leave policy not found' });
    }

    res.json({ message: 'Leave policy deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};