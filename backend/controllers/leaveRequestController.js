import db from '../models/index.js';
const { Op } = db.Sequelize;

const { LeaveRequest, LeaveRequestHistory, LeaveAllocation, sequelize } = db;

const calculateAvailableFromAllocation = (allocation) => {
  const carried = Number(allocation?.carryForwardFromPrevious || 0);
  const accrued = Number(allocation?.totalAccruedTillDate || 0);
  const used = Number(allocation?.usedLeaves || 0);
  return carried + accrued - used;
};

const buildWhere = (query = {}) => {
  const where = {};

  if (query.companyId) where.companyId = query.companyId;
  if (query.staffId) where.staffId = query.staffId;
  if (query.leaveTypeId) where.leaveTypeId = query.leaveTypeId;
  if (query.status) {
    const statuses = String(query.status)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (statuses.length === 1) where.status = statuses[0];
    else if (statuses.length > 1) where.status = { [Op.in]: statuses };
  }

  return where;
};

const includeConfig = (query = {}) => [
  {
    model: db.Employee,
    as: 'employee',
    ...(query.departmentId
      ? { where: { departmentId: query.departmentId }, required: true }
      : { required: false }),
  },
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
      include: includeConfig(req.query),
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
      include: includeConfig(),
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
  const transaction = await sequelize.transaction();
  try {
    const payload = { ...req.body };

    if (!payload.leaveAllocationId && payload.staffId && payload.leaveTypeId && payload.companyId) {
      const matchedAllocation = await LeaveAllocation.findOne({
        where: {
          staffId: payload.staffId,
          leaveTypeId: payload.leaveTypeId,
          companyId: payload.companyId,
          status: 'Active',
        },
        order: [['effectiveFrom', 'DESC']],
        transaction,
      });
      if (matchedAllocation) {
        payload.leaveAllocationId = matchedAllocation.leaveAllocationId;
      }
    }

    if (['Pending', 'Approved'].includes(String(payload.status || ''))) {
      const allocation = payload.leaveAllocationId
        ? await LeaveAllocation.findByPk(payload.leaveAllocationId, { transaction })
        : await LeaveAllocation.findOne({
            where: {
              staffId: payload.staffId,
              leaveTypeId: payload.leaveTypeId,
              companyId: payload.companyId,
              status: 'Active',
            },
            order: [['effectiveFrom', 'DESC']],
            transaction,
          });

      if (!allocation) {
        throw new Error('No active leave allocation found for selected leave type');
      }

      const available = calculateAvailableFromAllocation(allocation);
      const requested = Number(payload.totalDays || 0);
      if (requested > available) {
        throw new Error('Requested leave exceeds available balance');
      }
    }

    const leaveRequest = await LeaveRequest.create(payload, { transaction });

    const actionByStaffId = Number(payload.staffId);
    const actorIsValid = Number.isInteger(actionByStaffId) && actionByStaffId > 0;
    if (actorIsValid) {
      await LeaveRequestHistory.create(
        {
          leaveRequestId: leaveRequest.leaveRequestId,
          action: 'Created',
          actionBy: actionByStaffId,
          oldStatus: null,
          newStatus: leaveRequest.status,
          comments: payload.notes || 'Leave request created',
          actionContext: { source: 'createLeaveRequest', status: leaveRequest.status },
          ipAddress: req.ip || null,
          userAgent: req.get('user-agent') || null,
          companyId: leaveRequest.companyId,
          createdBy: payload.createdBy ?? null,
          updatedBy: payload.updatedBy ?? null,
        },
        { transaction }
      );

      if (leaveRequest.status === 'Pending') {
        await LeaveRequestHistory.create(
          {
            leaveRequestId: leaveRequest.leaveRequestId,
            action: 'Submitted',
            actionBy: actionByStaffId,
            oldStatus: 'Draft',
            newStatus: 'Pending',
            comments: payload.notes || 'Leave request submitted',
            actionContext: {
              source: 'createLeaveRequest',
              currentApprovalLevel: leaveRequest.currentApprovalLevel,
              maxApprovalLevel: leaveRequest.maxApprovalLevel,
            },
            ipAddress: req.ip || null,
            userAgent: req.get('user-agent') || null,
            companyId: leaveRequest.companyId,
            createdBy: payload.createdBy ?? null,
            updatedBy: payload.updatedBy ?? null,
          },
          { transaction }
        );
      }
    }

    await transaction.commit();
    res.status(201).json(leaveRequest);
  } catch (error) {
    await transaction.rollback();
    res.status(400).json({ error: error.message });
  }
};

export const updateLeaveRequest = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const existing = await LeaveRequest.findByPk(req.params.id, { transaction });
    if (!existing) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Leave request not found' });
    }

    const nextStatus = req.body.status ?? existing.status;
    const nextTotalDays = Number(req.body.totalDays ?? existing.totalDays ?? 0);
    const nextLeaveTypeId = req.body.leaveTypeId ?? existing.leaveTypeId;
    const nextCompanyId = req.body.companyId ?? existing.companyId;
    const nextStaffId = req.body.staffId ?? existing.staffId;
    const nextAllocationId = req.body.leaveAllocationId ?? existing.leaveAllocationId;

    if (['Pending', 'Approved'].includes(String(nextStatus))) {
      const allocation = nextAllocationId
        ? await LeaveAllocation.findByPk(nextAllocationId, { transaction })
        : await LeaveAllocation.findOne({
            where: {
              staffId: nextStaffId,
              leaveTypeId: nextLeaveTypeId,
              companyId: nextCompanyId,
              status: 'Active',
            },
            order: [['effectiveFrom', 'DESC']],
            transaction,
          });

      if (!allocation) {
        await transaction.rollback();
        return res.status(400).json({ error: 'No active leave allocation found for selected leave type' });
      }

      const available = calculateAvailableFromAllocation(allocation);
      const currentlyApprovedDays = existing.status === 'Approved' ? Number(existing.totalDays || 0) : 0;
      const effectiveNeeded = String(nextStatus) === 'Approved'
        ? Math.max(0, nextTotalDays - currentlyApprovedDays)
        : nextTotalDays;

      if (effectiveNeeded > available) {
        await transaction.rollback();
        const insufficientMessage =
          String(nextStatus) === 'Approved'
            ? 'Cannot approve leave: not enough leave balance'
            : 'Requested leave exceeds available balance';
        return res.status(400).json({ error: insufficientMessage });
      }
    }

    const [updated] = await LeaveRequest.update(req.body, {
      where: { leaveRequestId: req.params.id },
      transaction,
    });

    if (!updated) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Leave request not found' });
    }

    const leaveRequest = await LeaveRequest.findByPk(req.params.id, {
      include: includeConfig(),
      transaction,
    });

    const oldStatus = existing.status;
    const newStatus = leaveRequest.status;
    const statusChanged = oldStatus !== newStatus;

    if (statusChanged) {
      let delta = 0;
      if (oldStatus !== 'Approved' && newStatus === 'Approved') {
        delta = Number(leaveRequest.totalDays || 0);
      } else if (oldStatus === 'Approved' && newStatus !== 'Approved') {
        delta = -Number(existing.totalDays || leaveRequest.totalDays || 0);
      }

      if (delta !== 0) {
        let allocation = null;
        if (leaveRequest.leaveAllocationId) {
          allocation = await LeaveAllocation.findByPk(leaveRequest.leaveAllocationId, { transaction });
        }
        if (!allocation) {
          allocation = await LeaveAllocation.findOne({
            where: {
              staffId: leaveRequest.staffId,
              leaveTypeId: leaveRequest.leaveTypeId,
              companyId: leaveRequest.companyId,
              status: 'Active',
            },
            order: [['effectiveFrom', 'DESC']],
            transaction,
          });
        }

        if (!allocation) {
          throw new Error('No active leave allocation found for this leave request');
        }

        if (delta > 0) {
          const available = calculateAvailableFromAllocation(allocation);
          if (delta > available) {
            throw new Error('Cannot approve leave: not enough leave balance');
          }
        }

        const currentUsed = Number(allocation.usedLeaves || 0);
        const nextUsed = Math.max(0, currentUsed + delta);
        await allocation.update(
          {
            usedLeaves: Number(nextUsed.toFixed(2)),
            updatedBy: req.body.updatedBy ?? allocation.updatedBy ?? null,
          },
          { transaction }
        );

        if (!leaveRequest.leaveAllocationId) {
          await leaveRequest.update({ leaveAllocationId: allocation.leaveAllocationId }, { transaction });
        }
      }
    }

    const actionBy = Number(req.body.actionBy || req.body.staffId || leaveRequest.staffId);
    if (Number.isInteger(actionBy) && actionBy > 0) {
      let action = 'Modified';
      if (statusChanged) {
        if (newStatus === 'Pending') action = 'Submitted';
        else if (newStatus === 'Approved') action = 'Approved';
        else if (newStatus === 'Rejected') action = 'Rejected';
        else if (newStatus === 'Cancelled') action = 'Cancelled';
        else if (newStatus === 'Withdrawn') action = 'Withdrawn';
      }

      await LeaveRequestHistory.create(
        {
          leaveRequestId: leaveRequest.leaveRequestId,
          action,
          actionBy,
          oldStatus,
          newStatus,
          comments: req.body.notes || req.body.comments || null,
          actionContext: { source: 'updateLeaveRequest', statusChanged },
          ipAddress: req.ip || null,
          userAgent: req.get('user-agent') || null,
          companyId: leaveRequest.companyId,
          createdBy: req.body.createdBy ?? null,
          updatedBy: req.body.updatedBy ?? null,
        },
        { transaction }
      );
    }

    await transaction.commit();
    res.json(leaveRequest);
  } catch (error) {
    await transaction.rollback();
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
