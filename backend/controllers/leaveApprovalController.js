import db from '../models/index.js';
const { LeaveApproval } = db;
// Get all leave approvals
// In real usage: filter by leaveRequestId, approverId, companyId, status, etc.
export const getAllLeaveApprovals = async (req, res) => {
  try {
    const approvals = await LeaveApproval.findAll({
      include: [
        { model: db.LeaveRequest, as: 'leaveRequest' },
        { model: db.Employee, as: 'approver' },
        { model: db.Company, as: 'company' },
        
      ]
    });
    res.json(approvals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single leave approval by ID
export const getLeaveApprovalById = async (req, res) => {
  try {
    const approval = await LeaveApproval.findByPk(req.params.id, {
      include: [
        { model: db.LeaveRequest, as: 'leaveRequest' },
        { model: db.Employee, as: 'approver' },
        { model: db.Company, as: 'company' },
        
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
export const createLeaveApproval = async (req, res) => {
  try {
    const approval = await LeaveApproval.create(req.body);
    res.status(201).json(approval);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update leave approval
// (e.g. change status to Approved/Rejected/Forwarded, add comments)
export const updateLeaveApproval = async (req, res) => {
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
export const deleteLeaveApproval = async (req, res) => {
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