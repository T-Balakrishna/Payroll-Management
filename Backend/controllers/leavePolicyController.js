const LeavePolicy = require('../models/LeavePolicy');
const LeavePolicyDetails = require('../models/LeavePolicyDetails');
const LeaveType = require('../models/LeaveType');

// Create a new leave policy
exports.createLeavePolicy = async (req, res) => {
  try {
    const { policyName, description, createdBy, leaveAllocations } = req.body;

    const newPolicy = await LeavePolicy.create({ policyName, description, createdBy });

    // Add leave allocations
    if (leaveAllocations && leaveAllocations.length) {
      const details = leaveAllocations.map(a => ({
        leavePolicyId: newPolicy.leavePolicyId,
        leaveTypeId: a.leaveTypeId,
        allocatedLeaves: a.allocatedLeaves
      }));
      await LeavePolicyDetails.bulkCreate(details);
    }

    res.status(201).json({ ...newPolicy.dataValues, leaveAllocations });
  } catch (error) {
    console.error("❌ Error creating leave policy:", error);
    res.status(500).send("Error creating leave policy: " + error.message);
  }
};

// Get all active leave policies with their leave types
exports.getAllLeavePolicies = async (req, res) => {
  try {
    const policies = await LeavePolicy.findAll({
      where: { status: 'active' },
      include: [
        {
          model: LeaveType,
          through: { attributes: ['allocatedLeaves'] },
        }
      ],
    });
    res.json(policies);
  } catch (error) {
    console.error("❌ Error fetching leave policies:", error);
    res.status(500).send("Error fetching leave policies: " + error.message);
  }
};

// Get a single leave policy by ID
exports.getLeavePolicyById = async (req, res) => {
  try {
    const policy = await LeavePolicy.findOne({
      where: { leavePolicyId: req.params.id, status: 'active' },
      include: [
        {
          model: LeaveType,
          through: { attributes: ['allocatedLeaves'] },
        }
      ],
    });
    if (!policy) return res.status(404).send("Leave policy not found or inactive");
    res.json(policy);
  } catch (error) {
    console.error("❌ Error fetching leave policy:", error);
    res.status(500).send("Error fetching leave policy: " + error.message);
  }
};

// Update leave policy and its allocations
exports.updateLeavePolicy = async (req, res) => {
  try {
    const policy = await LeavePolicy.findOne({ where: { leavePolicyId: req.params.id, status: 'active' } });
    if (!policy) return res.status(404).send("Leave policy not found or inactive");

    const { policyName, description, leaveAllocations, updatedBy } = req.body;
    await policy.update({ policyName, description, updatedBy });

    if (leaveAllocations && leaveAllocations.length) {
      await LeavePolicyDetails.destroy({ where: { leavePolicyId: policy.leavePolicyId } });
      const details = leaveAllocations.map(a => ({
        leavePolicyId: policy.leavePolicyId,
        leaveTypeId: a.leaveTypeId,
        allocatedLeaves: a.allocatedLeaves
      }));
      await LeavePolicyDetails.bulkCreate(details);
    }

    res.json({ message: "Leave policy updated successfully" });
  } catch (error) {
    console.error("❌ Error updating leave policy:", error);
    res.status(500).send("Error updating leave policy: " + error.message);
  }
};

// Soft delete leave policy
exports.deleteLeavePolicy = async (req, res) => {
  try {
    const policy = await LeavePolicy.findOne({ where: { leavePolicyId: req.params.id, status: 'active' } });
    if (!policy) return res.status(404).send("Leave policy not found or already inactive");

    await policy.update({ status: 'inactive' });
    res.json({ message: "Leave policy deactivated successfully" });
  } catch (error) {
    console.error("❌ Error deleting leave policy:", error);
    res.status(500).send("Error deleting leave policy: " + error.message);
  }
};
