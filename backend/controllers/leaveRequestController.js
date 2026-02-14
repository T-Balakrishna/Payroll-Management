import db from '../models/index.js';
const { LeaveRequest } = db;
// Get all leave requests
// In real usage: filter by staffId, status, date range, companyId, etc.
export const getAllLeaveRequests = async (req, res) => {
  try {
    const leaveRequests = await LeaveRequest.findAll({
      include: [
        { model: db.Employee, as: 'employee' },
        { model: db.LeaveType, as: 'leaveType' },
        { model: db.LeaveAllocation, as: 'allocation' },
        { model: db.Company, as: 'company' },
        // { model: db.LeaveApproval, as: 'approvals' },   // heavy — include only when needed
        // { model: db.LeaveRequestHistory, as: 'history' }
      ]
    });
    res.json(leaveRequests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single leave request by ID
export const getLeaveRequestById = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findByPk(req.params.id, {
      include: [
        { model: db.Employee, as: 'employee' },
        { model: db.LeaveType, as: 'leaveType' },
        { model: db.LeaveAllocation, as: 'allocation' },
        { model: db.Company, as: 'company' },
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
export const createLeaveRequest = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.create(req.body);
    res.status(201).json(leaveRequest);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update leave request
// (e.g. edit draft, change status to Pending, update dates/reason)
export const updateLeaveRequest = async (req, res) => {
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
export const deleteLeaveRequest = async (req, res) => {
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