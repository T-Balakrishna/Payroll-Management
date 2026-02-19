import db from '../models/index.js';

const { Holiday } = db;

export const getAllHolidays = async (req, res) => {
  try {
    const where = {};
    if (req.query.companyId && req.query.companyId!=0) where.companyId = req.query.companyId;
    if (req.query.holidayPlanId) where.holidayPlanId = req.query.holidayPlanId;

    const holidays = await Holiday.findAll({
      where,
      include: [
        { model: db.HolidayPlan, as: 'plan' },
        { model: db.Company },
      ],
    });
    res.json(holidays);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getHolidayById = async (req, res) => {
  try {
    const holiday = await Holiday.findByPk(req.params.id, {
      include: [
        { model: db.HolidayPlan, as: 'plan' },
        { model: db.Company },
      ],
    });

    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found' });
    }

    res.json(holiday);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.create(req.body);
    res.status(201).json(holiday);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateHoliday = async (req, res) => {
  try {
    const [updated] = await Holiday.update(req.body, {
      where: { holidayId: req.params.id },
    });

    if (!updated) {
      return res.status(404).json({ message: 'Holiday not found' });
    }

    const holiday = await Holiday.findByPk(req.params.id);
    res.json(holiday);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteHoliday = async (req, res) => {
  try {
    const deleted = await Holiday.destroy({
      where: { holidayId: req.params.id },
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Holiday not found' });
    }

    res.json({ message: 'Holiday deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
