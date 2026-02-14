import db from '../models/index.js';
const { LeaveAllocation } = db;
// Get all leave allocations
// In real usage: always filter by companyId, staffId, leavePeriodId, etc.
export const getAllLeaveAllocations = async (req, res) => {
  try {
    const allocations = await LeaveAllocation.findAll({
      include: [
        { model: db.Employee, as: 'employee' },
        { model: db.LeaveType, as: 'leaveType' },
        { model: db.LeavePolicy, as: 'leavePolicy' },
        { model: db.Company, as: 'company' },
      ]
    });
    res.json(allocations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single leave allocation by ID
export const getLeaveAllocationById = async (req, res) => {
  try {
    const allocation = await LeaveAllocation.findByPk(req.params.id, {
      include: [
        { model: db.Employee, as: 'employee' },
        { model: db.LeaveType, as: 'leaveType' },
        { model: db.LeavePolicy, as: 'leavePolicy' },
        { model: db.Company, as: 'company' },
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
export const createLeaveAllocation = async (req, res) => {
  try {
    const allocation = await LeaveAllocation.create(req.body);
    res.status(201).json(allocation);
  } catch (error) {
    res.status(400).json({ error: error.message }); // better for validation
  }
};

// Update leave allocation
// (e.g. adjust usedLeaves, carry forward, status, etc.)
export const updateLeaveAllocation = async (req, res) => {
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
export const deleteLeaveAllocation = async (req, res) => {
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