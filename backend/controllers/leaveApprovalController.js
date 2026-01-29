const { LeaveApproval } = require('../models');

// Get all leave approvals
// In real usage: filter by leaveRequestId, approverId, companyId, status, etc.
exports.getAllLeaveApprovals = async (req, res) => {
  try {
    const approvals = await LeaveApproval.findAll({
      include: [
        { model: require('../models').LeaveRequest, as: 'leaveRequest' },
        { model: require('../models').Employee, as: 'approver' },
        { model: require('../models').Company, as: 'company' },
        { model: require('../models').User, as: 'creator' },
        { model: require('../models').User, as: 'updater' },
      ]
    });
    res.json(approvals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single leave approval by ID
exports.getLeaveApprovalById = async (req, res) => {
  try {
    const approval = await LeaveApproval.findByPk(req.params.id, {
      include: [
        { model: require('../models').LeaveRequest, as: 'leaveRequest' },
        { model: require('../models').Employee, as: 'approver' },
        { model: require('../models').Company, as: 'company' },
        { model: require('../models').User, as: 'creator' },
        { model: require('../models').User, as: 'updater' },
      ]
    });

    if (!approval) {
      return res.status(404).json({ message: 'Leave approval not found' });
    }

    res.json(approval);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new leave approval record
// (usually created automatically when a leave request enters approval workflow)
exports.createLeaveApproval = async (req, res) => {
  try {
    const approval = await LeaveApproval.create(req.body);
    res.status(201).json(approval);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update leave approval
// (e.g. change status to Approved/Rejected/Forwarded, add comments)
exports.updateLeaveApproval = async (req, res) => {
  try {
    const [updated] = await LeaveApproval.update(req.body, {
      where: { leaveApprovalId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Leave approval not found' });
    }

    const approval = await LeaveApproval.findByPk(req.params.id);
    res.json(approval);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete leave approval record (soft delete via paranoid: true)
exports.deleteLeaveApproval = async (req, res) => {
  try {
    const deleted = await LeaveApproval.destroy({
      where: { leaveApprovalId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Leave approval not found' });
    }

    res.json({ message: 'Leave approval deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};