import db from '../models/index.js';

const { LeaveType } = db;

const buildWhere = (query = {}) => {
  const where = {};

  if (query.companyId) where.companyId = query.companyId;
  if (query.status) where.status = query.status;

  return where;
};

export const getAllLeaveTypes = async (req, res) => {
  try {
    const includePolicies = String(req.query.includePolicies || '').toLowerCase() === 'true';

    const leaveTypes = await LeaveType.findAll({
      where: buildWhere(req.query),
      include: [
        { model: db.Company, as: 'company' },
        ...(includePolicies ? [{ model: db.LeavePolicy, as: 'leavePolicies' }] : []),
      ],
      order: [['leaveTypeId', 'DESC']],
    });

    res.json(leaveTypes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getLeaveTypeById = async (req, res) => {
  try {
    const leaveType = await LeaveType.findByPk(req.params.id, {
      include: [
        { model: db.Company, as: 'company' },
        { model: db.LeavePolicy, as: 'leavePolicies' },
      ],
    });

    if (!leaveType) {
      return res.status(404).json({ message: 'Leave type not found' });
    }

    res.json(leaveType);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createLeaveType = async (req, res) => {
  try {
    const leaveType = await LeaveType.create(req.body);
    res.status(201).json(leaveType);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateLeaveType = async (req, res) => {
  try {
    const [updated] = await LeaveType.update(req.body, {
      where: { leaveTypeId: req.params.id },
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

export const deleteLeaveType = async (req, res) => {
  try {
    const deleted = await LeaveType.destroy({
      where: { leaveTypeId: req.params.id },
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Leave type not found' });
    }

    res.json({ message: 'Leave type deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
