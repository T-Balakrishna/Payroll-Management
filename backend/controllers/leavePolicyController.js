import db from '../models/index.js';
const { Op } = db.Sequelize;

const { LeavePolicy, LeaveType } = db;

const buildWhere = (query = {}) => {
  const where = {};

  if (query.companyId) where.companyId = query.companyId;
  if (query.leaveTypeId) where.leaveTypeId = query.leaveTypeId;
  if (query.status) where.status = query.status;

  return where;
};

const validatePolicyScope = async ({ leaveTypeId, companyId }) => {
  const leaveType = await LeaveType.findByPk(leaveTypeId);
  if (!leaveType) {
    return { ok: false, status: 400, message: 'Invalid leaveTypeId' };
  }

  if (companyId && String(leaveType.companyId) !== String(companyId)) {
    return {
      ok: false,
      status: 400,
      message: 'leaveTypeId does not belong to the provided companyId',
    };
  }

  return { ok: true, leaveType };
};

const normalizeCarryForwardLimit = ({ leaveType, maxCarryForward }) => {
  const max = Number(maxCarryForward || 0);
  if (!leaveType?.isCarryForwardEnabled) return 0;
  if (!Number.isFinite(max) || max < 0) return 0;
  return max;
};

const resolveLeaveType = async ({ leaveTypeId, leaveTypeName, companyId }) => {
  if (leaveTypeId) {
    const byId = await LeaveType.findByPk(leaveTypeId);
    return byId || null;
  }

  if (!leaveTypeName) return null;

  const where = {
    [Op.or]: [
      { name: leaveTypeName },
      { leaveTypeName },
    ],
  };
  if (companyId) where.companyId = companyId;

  return LeaveType.findOne({ where, order: [['leaveTypeId', 'DESC']] });
};

const buildPayload = (body, resolvedLeaveType) => {
  const payload = { ...body };

  if (resolvedLeaveType) {
    payload.leaveTypeId = resolvedLeaveType.leaveTypeId;
    payload.companyId = payload.companyId ?? resolvedLeaveType.companyId;
  }

  delete payload.leaveType;
  delete payload.leaveTypeLegacy;
  delete payload.accrualDays;
  delete payload.effectiveFrom;
  delete payload.effectiveTo;
  delete payload.employmentTypeId;
  delete payload.designationId;
  delete payload.employeeGradeId;
  return payload;
};

export const getAllLeavePolicies = async (req, res) => {
  try {
    const leavePolicies = await LeavePolicy.findAll({
      where: buildWhere(req.query),
      include: [
        { model: db.Company, as: 'company' },
        { model: db.LeaveType, as: 'leaveType' },
      ],
      order: [['leavePolicyId', 'DESC']],
    });

    res.json(leavePolicies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getLeavePolicyById = async (req, res) => {
  try {
    const leavePolicy = await LeavePolicy.findByPk(req.params.id, {
      include: [
        { model: db.Company, as: 'company' },
        { model: db.LeaveType, as: 'leaveType' },
      ],
    });

    if (!leavePolicy) {
      return res.status(404).json({ message: 'Leave policy not found' });
    }

    res.json(leavePolicy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createLeavePolicy = async (req, res) => {
  try {
    const resolvedLeaveType = await resolveLeaveType({
      leaveTypeId: req.body.leaveTypeId,
      leaveTypeName: req.body.leaveType,
      companyId: req.body.companyId,
    });
    const payload = buildPayload(req.body, resolvedLeaveType);
    const { leaveTypeId, companyId } = payload;

    if (!leaveTypeId) {
      return res.status(400).json({ message: 'leaveTypeId or leaveType is required' });
    }

    const validation = await validatePolicyScope({ leaveTypeId, companyId });

    if (!validation.ok) {
      return res.status(validation.status).json({ message: validation.message });
    }

    payload.maxCarryForward = normalizeCarryForwardLimit({
      leaveType: validation.leaveType,
      maxCarryForward: payload.maxCarryForward,
    });

    const leavePolicy = await LeavePolicy.create(payload);
    res.status(201).json(leavePolicy);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateLeavePolicy = async (req, res) => {
  try {
    const existing = await LeavePolicy.findByPk(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Leave policy not found' });
    }

    const resolvedLeaveType = await resolveLeaveType({
      leaveTypeId: req.body.leaveTypeId ?? existing.leaveTypeId,
      leaveTypeName: req.body.leaveType,
      companyId: req.body.companyId ?? existing.companyId,
    });
    const payload = buildPayload(req.body, resolvedLeaveType);
    const leaveTypeId = payload.leaveTypeId ?? existing.leaveTypeId;
    const companyId = payload.companyId ?? existing.companyId;

    const validation = await validatePolicyScope({ leaveTypeId, companyId });
    if (!validation.ok) {
      return res.status(validation.status).json({ message: validation.message });
    }

    payload.maxCarryForward = normalizeCarryForwardLimit({
      leaveType: validation.leaveType,
      maxCarryForward: payload.maxCarryForward ?? existing.maxCarryForward,
    });

    await LeavePolicy.update(payload, {
      where: { leavePolicyId: req.params.id },
    });

    const leavePolicy = await LeavePolicy.findByPk(req.params.id, {
      include: [
        { model: db.Company, as: 'company' },
        { model: db.LeaveType, as: 'leaveType' },
      ],
    });
    res.json(leavePolicy);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteLeavePolicy = async (req, res) => {
  try {
    const deleted = await LeavePolicy.destroy({
      where: { leavePolicyId: req.params.id },
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Leave policy not found' });
    }

    res.json({ message: 'Leave policy deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

