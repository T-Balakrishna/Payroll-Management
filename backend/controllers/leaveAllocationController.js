import db from '../models/index.js';

const { LeaveAllocation, LeavePolicy, LeaveType, LeavePeriod } = db;

const buildWhere = (query = {}) => {
  const where = {};

  if (query.companyId) where.companyId = query.companyId;
  if (query.staffId) where.staffId = query.staffId;
  if (query.leaveTypeId) where.leaveTypeId = query.leaveTypeId;
  if (query.leavePolicyId) where.leavePolicyId = query.leavePolicyId;
  if (query.status) where.status = query.status;

  return where;
};

const validatePolicyLink = async (payload) => {
  if (!payload.leavePolicyId) return { ok: true };

  const policy = await LeavePolicy.findByPk(payload.leavePolicyId);
  if (!policy) {
    return { ok: false, status: 400, message: 'Invalid leavePolicyId' };
  }

  if (payload.leaveTypeId && String(policy.leaveTypeId) !== String(payload.leaveTypeId)) {
    return {
      ok: false,
      status: 400,
      message: 'leavePolicyId does not match the provided leaveTypeId',
    };
  }

  if (payload.companyId && String(policy.companyId) !== String(payload.companyId)) {
    return {
      ok: false,
      status: 400,
      message: 'leavePolicyId does not belong to the provided companyId',
    };
  }

  return { ok: true, policy };
};

const validateAllocationLimit = async ({ leaveTypeId, allocatedLeaves }) => {
  if (!leaveTypeId) {
    return { ok: false, status: 400, message: 'leaveTypeId is required for allocation' };
  }

  const leaveType = await LeaveType.findByPk(leaveTypeId);
  if (!leaveType) {
    return { ok: false, status: 400, message: 'Invalid leaveTypeId' };
  }

  const requestedLeaves = Number(allocatedLeaves ?? 0);
  if (!Number.isFinite(requestedLeaves) || requestedLeaves < 0) {
    return { ok: false, status: 400, message: 'allocatedLeaves must be a non-negative number' };
  }

  const max = leaveType.maxAllocationPertype;
  const overAllocationAllowed = Boolean(leaveType.allowOverAllocation);

  if (!overAllocationAllowed && max !== null && max !== undefined && requestedLeaves > Number(max)) {
    return {
      ok: false,
      status: 400,
      message: `allocatedLeaves (${requestedLeaves}) exceeds maxAllocationPertype (${max}) for this leave type`,
    };
  }

  return { ok: true, leaveType };
};

const validateDuplicateAllocation = async ({
  staffId,
  leaveTypeId,
  effectiveFrom,
  effectiveTo,
  ignoreAllocationId = null,
}) => {
  if (!staffId || !leaveTypeId || !effectiveFrom || !effectiveTo) {
    return {
      ok: false,
      status: 400,
      message: 'staffId, leaveTypeId, effectiveFrom and effectiveTo are required',
    };
  }

  const where = { staffId, leaveTypeId, effectiveFrom, effectiveTo };
  if (ignoreAllocationId) {
    where.leaveAllocationId = { [db.Sequelize.Op.ne]: ignoreAllocationId };
  }

  const existing = await LeaveAllocation.findOne({ where });
  if (existing) {
    return {
      ok: false,
      status: 409,
      message: 'This employee already has this leave type allocated in the same leave period',
    };
  }

  return { ok: true };
};

const parseDateOnly = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const getActiveLeavePeriodForCompany = async (companyId) => {
  if (!companyId) return null;
  const today = new Date().toISOString().slice(0, 10);
  let activePeriod = await LeavePeriod.findOne({
    where: {
      companyId,
      status: 'Active',
      startDate: { [db.Sequelize.Op.lte]: today },
      endDate: { [db.Sequelize.Op.gte]: today },
    },
    order: [['startDate', 'DESC']],
  });

  if (!activePeriod) {
    activePeriod = await LeavePeriod.findOne({
      where: { companyId, status: 'Active' },
      order: [['startDate', 'DESC']],
    });
  }
  // console.log("Hellooooo",activePeriod);  
  return activePeriod;
};

const getPreviousLeavePeriodForCompany = async ({ companyId, currentStartDate }) => {
  if (!companyId || !currentStartDate) return null;
  return LeavePeriod.findOne({ 
    where: {
      companyId,
      endDate: { [db.Sequelize.Op.lt]: currentStartDate },
    },
    order: [['endDate', 'DESC']],
  });
};

const getPreviousPeriodAllocation = async ({ companyId, staffId, leaveTypeId, previousPeriod }) => {
  if (!previousPeriod) return null;

  const exact = await LeaveAllocation.findOne({
    where: {
      companyId,
      staffId,
      leaveTypeId,
      effectiveFrom: previousPeriod.startDate,
      effectiveTo: previousPeriod.endDate,
    },
    order: [['leaveAllocationId', 'DESC']],
  });

  if (exact) return exact;

  return LeaveAllocation.findOne({
    where: {
      companyId,
      staffId,
      leaveTypeId,
      effectiveTo: { [db.Sequelize.Op.lte]: previousPeriod.endDate },
    },
    order: [['effectiveTo', 'DESC'], ['leaveAllocationId', 'DESC']],
  });
};

const computeCarryForwardFromPrevious = async ({
  companyId,
  staffId,
  leaveType,
  leavePolicy,
  currentPeriod,
}) => {
  if (!leaveType?.isCarryForwardEnabled) return 0;
  if (!companyId || !staffId || !leaveType?.leaveTypeId || !currentPeriod?.startDate) return 0;

  const previousPeriod = await getPreviousLeavePeriodForCompany({
    companyId,
    currentStartDate: currentPeriod.startDate,
  });
  if (!previousPeriod) return 0;

  const previousAllocation = await getPreviousPeriodAllocation({
    companyId,
    staffId,
    leaveTypeId: leaveType.leaveTypeId,
    previousPeriod,
  });
  if (!previousAllocation) return 0;

  const remaining =
    Number(previousAllocation.carryForwardFromPrevious || 0) +
    Number(previousAllocation.totalAccruedTillDate || 0) -
    Number(previousAllocation.usedLeaves || 0);

  if (!Number.isFinite(remaining) || remaining <= 0) return 0;

  const cap = Number(leavePolicy?.maxCarryForward ?? 0);
  if (Number.isFinite(cap) && cap > 0) {
    return roundTo2(Math.min(remaining, cap));
  }
  return roundTo2(remaining);
};

const roundTo2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const getMonthlyPeriodsElapsed = (startDate, endDate) => {
  if (!startDate || !endDate || endDate < startDate) return 0;

  let months =
    (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
    (endDate.getUTCMonth() - startDate.getUTCMonth());

  if (endDate.getUTCDate() < startDate.getUTCDate()) {
    months -= 1;
  }

  return Math.max(0, months) + 1;
};

const getQuarterlyPeriodsElapsed = (startDate, endDate) => {
  const monthlyPeriods = getMonthlyPeriodsElapsed(startDate, endDate);
  if (!monthlyPeriods) return 0;
  return Math.floor((monthlyPeriods - 1) / 3) + 1;
};

const computeAccruedTillDate = (allocation, leavePolicy, leavePeriod) => {
  const allocatedLeaves = Number(allocation?.allocatedLeaves || 0);
  if (!Number.isFinite(allocatedLeaves) || allocatedLeaves <= 0) return 0;

  const effectiveFrom =
    parseDateOnly(leavePeriod?.startDate) ||
    parseDateOnly(allocation?.effectiveFrom) ||
    parseDateOnly(allocation?.allocatedDate) ||
    new Date();
  const now = new Date();
  const effectiveTo =
    parseDateOnly(leavePeriod?.endDate) ||
    parseDateOnly(allocation?.effectiveTo);
  const accrualEnd = effectiveTo && effectiveTo < now ? effectiveTo : now;

  if (accrualEnd < effectiveFrom) return 0;

  const frequency = leavePolicy?.accrualFrequency || 'Yearly';

  if (frequency === 'Monthly') {
    const periods = getMonthlyPeriodsElapsed(effectiveFrom, accrualEnd);
    const accrued = roundTo2((allocatedLeaves / 12) * periods);
    return Math.min(allocatedLeaves, accrued);
  }

  if (frequency === 'Quarterly') {
    const periods = getQuarterlyPeriodsElapsed(effectiveFrom, accrualEnd);
    const accrued = roundTo2((allocatedLeaves / 4) * periods);
    return Math.min(allocatedLeaves, accrued);
  }

  if (frequency === 'Yearly' || frequency === 'On Joining') {
    return allocatedLeaves;
  }

  return allocatedLeaves;
};

const syncAccrualForAllocation = async (allocation) => {
  if (!allocation) return allocation;

  const leavePolicy =
    allocation.leavePolicy ||
    (allocation.leavePolicyId ? await LeavePolicy.findByPk(allocation.leavePolicyId) : null);
  const activeLeavePeriod = await getActiveLeavePeriodForCompany(allocation.companyId);

  const computedAccrued = computeAccruedTillDate(allocation, leavePolicy, activeLeavePeriod);
  const existingAccrued = Number(allocation.totalAccruedTillDate || 0);

  if (Math.abs(existingAccrued - computedAccrued) >= 0.01) {
    await LeaveAllocation.update(
      { totalAccruedTillDate: computedAccrued },
      { where: { leaveAllocationId: allocation.leaveAllocationId } }
    );
    allocation.setDataValue('totalAccruedTillDate', computedAccrued);
  }

  return allocation;
};

const includeConfig = [
  { model: db.Employee, as: 'employee' },
  { model: db.LeaveType, as: 'leaveType' },
  { model: db.LeavePolicy, as: 'leavePolicy' },
  { model: db.Company, as: 'company' },
];

export const getAllLeaveAllocations = async (req, res) => {
  try {
    const allocations = await LeaveAllocation.findAll({
      where: buildWhere(req.query),
      include: includeConfig,
      order: [['leaveAllocationId', 'DESC']],
    });
    await Promise.all((allocations || []).map((allocation) => syncAccrualForAllocation(allocation)));
    res.json(allocations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getLeaveAllocationById = async (req, res) => {
  try {
    const allocation = await LeaveAllocation.findByPk(req.params.id, {
      include: includeConfig,
    });

    if (!allocation) {
      return res.status(404).json({ message: 'Leave allocation not found' });
    }

    await syncAccrualForAllocation(allocation);
    res.json(allocation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createLeaveAllocation = async (req, res) => {
  try {
    const validation = await validatePolicyLink(req.body);
    if (!validation.ok) {
      return res.status(validation.status).json({ message: validation.message });
    }

    const allocationPayload = { ...req.body };
    if (validation.policy) {
      allocationPayload.leaveTypeId = validation.policy.leaveTypeId;
      allocationPayload.companyId = validation.policy.companyId;
    }

    const activeLeavePeriod = await getActiveLeavePeriodForCompany(allocationPayload.companyId);
    if (!activeLeavePeriod) {
      return res.status(400).json({ message: 'No active leave period found for the selected company' });
    }
    allocationPayload.effectiveFrom = allocationPayload.effectiveFrom || activeLeavePeriod.startDate;
    allocationPayload.effectiveTo = allocationPayload.effectiveTo || activeLeavePeriod.endDate;

    const allocationValidation = await validateAllocationLimit({
      leaveTypeId: allocationPayload.leaveTypeId,
      allocatedLeaves: allocationPayload.allocatedLeaves,
    });
    if (!allocationValidation.ok) {
      return res.status(allocationValidation.status).json({ message: allocationValidation.message });
    }

    const duplicateValidation = await validateDuplicateAllocation({
      staffId: allocationPayload.staffId,
      leaveTypeId: allocationPayload.leaveTypeId,
      effectiveFrom: allocationPayload.effectiveFrom,
      effectiveTo: allocationPayload.effectiveTo,
    });
    if (!duplicateValidation.ok) {
      return res.status(duplicateValidation.status).json({ message: duplicateValidation.message });
    }

    allocationPayload.carryForwardFromPrevious = await computeCarryForwardFromPrevious({
      companyId: allocationPayload.companyId,
      staffId: allocationPayload.staffId,
      leaveType: allocationValidation.leaveType,
      leavePolicy: validation.policy || null,
      currentPeriod: activeLeavePeriod,
    });

    const allocation = await LeaveAllocation.create(allocationPayload);
    const allocationWithRefs = await LeaveAllocation.findByPk(allocation.leaveAllocationId, {
      include: includeConfig,
    });
    await syncAccrualForAllocation(allocationWithRefs);
    res.status(201).json(allocationWithRefs);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateLeaveAllocation = async (req, res) => {
  try {
    const existing = await LeaveAllocation.findByPk(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Leave allocation not found' });
    }

    const mergedPayload = {
      ...existing.get({ plain: true }),
      ...req.body,
    };

    const validation = await validatePolicyLink(mergedPayload);
    if (!validation.ok) {
      return res.status(validation.status).json({ message: validation.message });
    }

    const updatePayload = { ...req.body };
    if (validation.policy) {
      updatePayload.leaveTypeId = validation.policy.leaveTypeId;
      updatePayload.companyId = validation.policy.companyId;
    }

    const targetCompanyId = updatePayload.companyId ?? mergedPayload.companyId;
    const activeLeavePeriod = await getActiveLeavePeriodForCompany(targetCompanyId);
    if (!activeLeavePeriod) {
      return res.status(400).json({ message: 'No active leave period found for the selected company' });
    }
    updatePayload.effectiveFrom = updatePayload.effectiveFrom || activeLeavePeriod.startDate;
    updatePayload.effectiveTo = updatePayload.effectiveTo || activeLeavePeriod.endDate;

    const effectivePayload = {
      ...mergedPayload,
      ...updatePayload,
      leaveTypeId: validation.policy?.leaveTypeId ?? updatePayload.leaveTypeId ?? mergedPayload.leaveTypeId,
    };

    const allocationValidation = await validateAllocationLimit({
      leaveTypeId: effectivePayload.leaveTypeId,
      allocatedLeaves: effectivePayload.allocatedLeaves,
    });
    if (!allocationValidation.ok) {
      return res.status(allocationValidation.status).json({ message: allocationValidation.message });
    }

    const duplicateValidation = await validateDuplicateAllocation({
      staffId: effectivePayload.staffId,
      leaveTypeId: effectivePayload.leaveTypeId,
      effectiveFrom: effectivePayload.effectiveFrom,
      effectiveTo: effectivePayload.effectiveTo,
      ignoreAllocationId: existing.leaveAllocationId,
    });
    if (!duplicateValidation.ok) {
      return res.status(duplicateValidation.status).json({ message: duplicateValidation.message });
    }

    updatePayload.carryForwardFromPrevious = await computeCarryForwardFromPrevious({
      companyId: targetCompanyId,
      staffId: effectivePayload.staffId,
      leaveType: allocationValidation.leaveType,
      leavePolicy: validation.policy || null,
      currentPeriod: activeLeavePeriod,
    });

    await LeaveAllocation.update(updatePayload, {
      where: { leaveAllocationId: req.params.id },
    });

    const allocation = await LeaveAllocation.findByPk(req.params.id, {
      include: includeConfig,
    });
    await syncAccrualForAllocation(allocation);

    res.json(allocation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteLeaveAllocation = async (req, res) => {
  try {
    const deleted = await LeaveAllocation.destroy({
      where: { leaveAllocationId: req.params.id },
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Leave allocation not found' });
    }

    res.json({ message: 'Leave allocation deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
