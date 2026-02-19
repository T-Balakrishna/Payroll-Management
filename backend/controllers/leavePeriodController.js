import db from '../models/index.js';

const { LeavePeriod } = db;

const buildWhere = (query = {}) => {
  const where = {};
  if (query.companyId && query.companyId !== '0') where.companyId = query.companyId;
  if (query.status) where.status = query.status;
  return where;
};

const toDateOnly = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const validateDates = ({ startDate, endDate }) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false, message: 'startDate and endDate must be valid dates' };
  }
  if (end <= start) {
    return { ok: false, message: 'endDate must be after startDate' };
  }
  return { ok: true };
};

const validateSingleActivePeriod = async ({ companyId, status, ignoreLeavePeriodId = null }) => {
  if (!companyId || status !== 'Active') return { ok: true };

  const where = {
    companyId,
    status: 'Active',
  };
  if (ignoreLeavePeriodId) {
    where.leavePeriodId = { [db.Sequelize.Op.ne]: ignoreLeavePeriodId };
  }

  const existingActive = await LeavePeriod.findOne({ where });
  if (existingActive) {
    return {
      ok: false,
      status: 409,
      message: 'Another active leave period already exists for this company',
    };
  }

  return { ok: true };
};

const validateNoOverlappingPeriod = async ({
  companyId,
  startDate,
  endDate,
  ignoreLeavePeriodId = null,
}) => {
  if (!companyId || !startDate || !endDate) {
    return { ok: false, status: 400, message: 'companyId, startDate and endDate are required' };
  }

  const where = {
    companyId,
    startDate: { [db.Sequelize.Op.lte]: endDate },
    endDate: { [db.Sequelize.Op.gte]: startDate },
  };
  if (ignoreLeavePeriodId) {
    where.leavePeriodId = { [db.Sequelize.Op.ne]: ignoreLeavePeriodId };
  }

  const overlap = await LeavePeriod.findOne({ where });
  if (overlap) {
    return {
      ok: false,
      status: 409,
      message: 'A leave period already exists for this company in the selected date range',
    };
  }

  return { ok: true };
};

export const getAllLeavePeriods = async (req, res) => {
  try {
    const leavePeriods = await LeavePeriod.findAll({
      where: buildWhere(req.query),
      include: [
        { model: db.Company, as: 'company' },
      ],
      order: [['startDate', 'DESC']],
    });
    res.json(leavePeriods);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getLeavePeriodById = async (req, res) => {
  try {
    const leavePeriod = await LeavePeriod.findByPk(req.params.id, {
      include: [
        { model: db.Company, as: 'company' },
      ],
    });
    if (!leavePeriod) {
      return res.status(404).json({ message: 'Leave period not found' });
    }
    res.json(leavePeriod);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getActiveLeavePeriod = async (req, res) => {
  try {
    const companyId = req.query.companyId;
    if (!companyId || companyId === '0') {
      return res.status(400).json({ message: 'companyId is required' });
    }

    const today = toDateOnly(new Date());
    let activeLeavePeriod = await LeavePeriod.findOne({
      where: {
        companyId,
        status: 'Active',
        startDate: { [db.Sequelize.Op.lte]: today },
        endDate: { [db.Sequelize.Op.gte]: today },
      },
      order: [['startDate', 'DESC']],
    });

    // Fallback: if no date-window match, return the latest status=Active period.
    if (!activeLeavePeriod) {
      activeLeavePeriod = await LeavePeriod.findOne({
        where: {
          companyId,
          status: 'Active',
        },
        order: [['startDate', 'DESC']],
      });
    }

    if (!activeLeavePeriod) {
      return res.status(404).json({ message: 'No active leave period found for this company' });
    }

    res.json(activeLeavePeriod);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createLeavePeriod = async (req, res) => {
  try {
    const dateValidation = validateDates(req.body);
    if (!dateValidation.ok) {
      return res.status(400).json({ message: dateValidation.message });
    }

    const activeValidation = await validateSingleActivePeriod({
      companyId: req.body.companyId,
      status: req.body.status ?? 'Active',
    });
    if (!activeValidation.ok) {
      return res.status(activeValidation.status).json({ message: activeValidation.message });
    }

    const overlapValidation = await validateNoOverlappingPeriod({
      companyId: req.body.companyId,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
    });
    if (!overlapValidation.ok) {
      return res.status(overlapValidation.status).json({ message: overlapValidation.message });
    }

    const leavePeriod = await LeavePeriod.create(req.body);
    res.status(201).json(leavePeriod);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateLeavePeriod = async (req, res) => {
  try {
    const existing = await LeavePeriod.findByPk(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Leave period not found' });
    }

    const dateValidation = validateDates({
      startDate: req.body.startDate ?? existing.startDate,
      endDate: req.body.endDate ?? existing.endDate,
    });
    if (!dateValidation.ok) {
      return res.status(400).json({ message: dateValidation.message });
    }

    const activeValidation = await validateSingleActivePeriod({
      companyId: req.body.companyId ?? existing.companyId,
      status: req.body.status ?? existing.status,
      ignoreLeavePeriodId: existing.leavePeriodId,
    });
    if (!activeValidation.ok) {
      return res.status(activeValidation.status).json({ message: activeValidation.message });
    }

    const overlapValidation = await validateNoOverlappingPeriod({
      companyId: req.body.companyId ?? existing.companyId,
      startDate: req.body.startDate ?? existing.startDate,
      endDate: req.body.endDate ?? existing.endDate,
      ignoreLeavePeriodId: existing.leavePeriodId,
    });
    if (!overlapValidation.ok) {
      return res.status(overlapValidation.status).json({ message: overlapValidation.message });
    }

    await LeavePeriod.update(req.body, {
      where: { leavePeriodId: req.params.id },
    });

    const leavePeriod = await LeavePeriod.findByPk(req.params.id);
    res.json(leavePeriod);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteLeavePeriod = async (req, res) => {
  try {
    const deleted = await LeavePeriod.destroy({
      where: { leavePeriodId: req.params.id },
    });
    if (!deleted) {
      return res.status(404).json({ message: 'Leave period not found' });
    }
    res.json({ message: 'Leave period deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
