const { LeaveRequest } = require('../models');

// Get all leave requests
// In real usage: filter by employeeId, status, date range, companyId, etc.
exports.getAllLeaveRequests = async (req, res) => {
  try {
    const leaveRequests = await LeaveRequest.findAll({
      include: [
        { model: require('../models').Employee, as: 'employee' },
        { model: require('../models').LeaveType, as: 'leaveType' },
        { model: require('../models').LeaveAllocation, as: 'allocation' },
        { model: require('../models').Company, as: 'company' },
        // { model: require('../models').LeaveApproval, as: 'approvals' },   // heavy — include only when needed
        // { model: require('../models').LeaveRequestHistory, as: 'history' }
      ]
    });
    res.json(leaveRequests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single leave request by ID
exports.getLeaveRequestById = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findByPk(req.params.id, {
      include: [
        { model: require('../models').Employee, as: 'employee' },
        { model: require('../models').LeaveType, as: 'leaveType' },
        { model: require('../models').LeaveAllocation, as: 'allocation' },
        { model: require('../models').Company, as: 'company' },
      ]
    });

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    res.json(leaveRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new leave request (draft or direct submit)
exports.createLeaveRequest = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.create(req.body);
    res.status(201).json(leaveRequest);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update leave request
// (e.g. edit draft, change status to Pending, update dates/reason)
exports.updateLeaveRequest = async (req, res) => {
  try {
    const [updated] = await LeaveRequest.update(req.body, {
      where: { leaveRequestId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    const leaveRequest = await LeaveRequest.findByPk(req.params.id);
    res.json(leaveRequest);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete / cancel leave request (soft delete via paranoid: true)
exports.deleteLeaveRequest = async (req, res) => {
  try {
    const deleted = await LeaveRequest.destroy({
      where: { leaveRequestId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    res.json({ message: 'Leave request deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};