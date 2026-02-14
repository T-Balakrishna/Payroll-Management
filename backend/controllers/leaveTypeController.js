import db from '../models/index.js';
const { LeaveType } = db;
// Get all leave types
// In real usage: almost always filtered by companyId
export const getAllLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = await LeaveType.findAll({
      include: [
        { model: db.Company, as: 'company' },
        // { model: db.LeavePolicy, as: 'leavePolicies' },   // heavy — include only when needed
        // { model: db.LeaveAllocation, as: 'allocations' }
        // { model: db.LeaveRequest, as: 'requests' }
      ]
    });
    res.json(leaveTypes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single leave type by ID
export const getLeaveTypeById = async (req, res) => {
  try {
    const leaveType = await LeaveType.findByPk(req.params.id, {
      include: [
        { model: db.Company, as: 'company' },
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
export const createLeaveType = async (req, res) => {
  try {
    const leaveType = await LeaveType.create(req.body);
    res.status(201).json(leaveType);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update leave type
export const updateLeaveType = async (req, res) => {
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
export const deleteLeaveType = async (req, res) => {
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