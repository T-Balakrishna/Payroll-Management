const { HolidayPlan } = require('../models');

// Get all holiday plans (usually filtered by companyId in real usage)
exports.getAllHolidayPlans = async (req, res) => {
  try {
    const holidayPlans = await HolidayPlan.findAll({
      include: [
        { model: require('../models').Company, as: 'company' },
        { model: require('../models').User, as: 'Creator' },
        { model: require('../models').User, as: 'Updater' },
        // { model: require('../models').Holiday, as: 'holidays' }   // ← only include when really needed
      ]
    });
    res.json(holidayPlans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single holiday plan by ID
exports.getHolidayPlanById = async (req, res) => {
  try {
    const holidayPlan = await HolidayPlan.findByPk(req.params.id, {
      include: [
        { model: require('../models').Company, as: 'company' },
        { model: require('../models').User, as: 'Creator' },
        { model: require('../models').User, as: 'Updater' },
        // { model: require('../models').Holiday, as: 'holidays' }
      ]
    });

    if (!holidayPlan) {
      return res.status(404).json({ message: 'Holiday plan not found' });
    }

    res.json(holidayPlan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new holiday plan
exports.createHolidayPlan = async (req, res) => {
  try {
    const holidayPlan = await HolidayPlan.create(req.body);
    res.status(201).json(holidayPlan);
  } catch (error) {
    res.status(400).json({ error: error.message }); // better for validation errors
  }
};

// Update holiday plan
exports.updateHolidayPlan = async (req, res) => {
  try {
    const [updated] = await HolidayPlan.update(req.body, {
      where: { holidayPlanId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Holiday plan not found' });
    }

    const holidayPlan = await HolidayPlan.findByPk(req.params.id);
    res.json(holidayPlan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete holiday plan (soft delete via paranoid: true)
exports.deleteHolidayPlan = async (req, res) => {
  try {
    const deleted = await HolidayPlan.destroy({
      where: { holidayPlanId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Holiday plan not found' });
    }

    res.json({ message: 'Holiday plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};