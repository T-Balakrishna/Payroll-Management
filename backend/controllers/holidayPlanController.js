import db from '../models/index.js';

const { HolidayPlan, LeavePeriod } = db;

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

  return activePeriod;
};

export const getAllHolidayPlans = async (req, res) => {
  try {
    const where = {};
    if (req.query.companyId && req.query.companyId!=0) where.companyId = req.query.companyId;
    
    const holidayPlans = await HolidayPlan.findAll({
      where,
      include: [{ model: db.Company }],
    });
    res.json(holidayPlans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getHolidayPlanById = async (req, res) => {
  try {
    const holidayPlan = await HolidayPlan.findByPk(req.params.id, {
      include: [{ model: db.Company }],
    });

    if (!holidayPlan) {
      return res.status(404).json({ message: 'Holiday plan not found' });
    }

    res.json(holidayPlan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createHolidayPlan = async (req, res) => {
  try {
    const companyId = req.body.companyId;
    if (!companyId) {
      return res.status(400).json({ message: 'companyId is required' });
    }

    const activeLeavePeriod = await getActiveLeavePeriodForCompany(companyId);
    if (!activeLeavePeriod) {
      return res.status(400).json({ message: 'No active leave period found for this company' });
    }

    const payload = {
      ...req.body,
      startDate: activeLeavePeriod.startDate,
      endDate: activeLeavePeriod.endDate,
    };

    const holidayPlan = await HolidayPlan.create(payload);
    res.status(201).json(holidayPlan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateHolidayPlan = async (req, res) => {
  try {
    const existing = await HolidayPlan.findByPk(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Holiday plan not found' });
    }

    const companyId = req.body.companyId ?? existing.companyId;
    const activeLeavePeriod = await getActiveLeavePeriodForCompany(companyId);
    if (!activeLeavePeriod) {
      return res.status(400).json({ message: 'No active leave period found for this company' });
    }

    const payload = {
      ...req.body,
      startDate: activeLeavePeriod.startDate,
      endDate: activeLeavePeriod.endDate,
    };

    await HolidayPlan.update(payload, {
      where: { holidayPlanId: req.params.id },
    });

    const holidayPlan = await HolidayPlan.findByPk(req.params.id);
    res.json(holidayPlan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteHolidayPlan = async (req, res) => {
  try {
    const deleted = await HolidayPlan.destroy({
      where: { holidayPlanId: req.params.id },
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Holiday plan not found' });
    }

    res.json({ message: 'Holiday plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
