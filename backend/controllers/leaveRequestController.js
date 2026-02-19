import db from '../models/index.js';

const { LeaveRequest } = db;

const buildWhere = (query = {}) => {
  const where = {};

  if (query.companyId) where.companyId = query.companyId;
  if (query.staffId) where.staffId = query.staffId;
  if (query.leaveTypeId) where.leaveTypeId = query.leaveTypeId;
  if (query.status) where.status = query.status;

  return where;
};

const includeConfig = [
  { model: db.Employee, as: 'employee' },
  { model: db.LeaveType, as: 'leaveType' },
  {
    model: db.LeaveAllocation,
    as: 'allocation',
    include: [{ model: db.LeavePolicy, as: 'leavePolicy' }],
  },
  { model: db.Company, as: 'company' },
];

export const getAllLeaveRequests = async (req, res) => {
  try {
    const leaveRequests = await LeaveRequest.findAll({
      where: buildWhere(req.query),
      include: includeConfig,
      order: [['leaveRequestId', 'DESC']],
    });
    res.json(leaveRequests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getLeaveRequestById = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findByPk(req.params.id, {
      include: includeConfig,
    });

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    res.json(leaveRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createLeaveRequest = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.create(req.body);
    res.status(201).json(leaveRequest);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateLeaveRequest = async (req, res) => {
  try {
    const [updated] = await LeaveRequest.update(req.body, {
      where: { leaveRequestId: req.params.id },
    });

    if (!updated) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    const leaveRequest = await LeaveRequest.findByPk(req.params.id, {
      include: includeConfig,
    });
    res.json(leaveRequest);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteLeaveRequest = async (req, res) => {
  try {
    const deleted = await LeaveRequest.destroy({
      where: { leaveRequestId: req.params.id },
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    res.json({ message: 'Leave request deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getLeaveRequestStatsByCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const where = { companyId };

    if (req.query.departmentId) {
      where['$employee.departmentId$'] = req.query.departmentId;
    }

    const leaveRequests = await LeaveRequest.findAll({
      where,
      attributes: ['status'],
      include: [
        {
          model: db.Employee,
          as: 'employee',
          attributes: [],
          required: false,
        },
      ],
      raw: true,
    });

    const summary = leaveRequests.reduce(
      (acc, row) => {
        const status = String(row.status || '').toLowerCase();
        if (status === 'approved') acc.approved += 1;
        else if (status === 'rejected') acc.rejected += 1;
        else if (status === 'pending') acc.pending += 1;
        return acc;
      },
      { approved: 0, pending: 0, rejected: 0 }
    );

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
