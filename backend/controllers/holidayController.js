const { Holiday } = require('../models');

// Get all holidays
// In practice: almost always filter by companyId + date range
exports.getAllHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.findAll({
      include: [
        { model: require('../models').HolidayPlan, as: 'plan' },
        { model: require('../models').Company, as: 'company' },
        
      ]
    });
    res.json(holidays);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single holiday by ID
exports.getHolidayById = async (req, res) => {
  try {
    const holiday = await Holiday.findByPk(req.params.id, {
      include: [
        { model: require('../models').HolidayPlan, as: 'plan' },
        { model: require('../models').Company, as: 'company' },
        
      ]
    });

    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found' });
    }

    res.json(holiday);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new holiday entry
exports.createHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.create(req.body);
    res.status(201).json(holiday);
  } catch (error) {
    res.status(400).json({ error: error.message }); // better for validation errors
  }
};

// Update holiday
exports.updateHoliday = async (req, res) => {
  try {
    const [updated] = await Holiday.update(req.body, {
      where: { holidayId: req.params.id }
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

// Delete holiday (soft delete via paranoid: true)
exports.deleteHoliday = async (req, res) => {
  try {
    const deleted = await Holiday.destroy({
      where: { holidayId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Holiday not found' });
    }

    res.json({ message: 'Holiday deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};