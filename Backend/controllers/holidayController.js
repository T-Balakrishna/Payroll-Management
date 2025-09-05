const Holiday = require('../models/Holiday'); // Sequelize model
const HolidayPlan = require('../models/HolidayPlan');

// Create
exports.createHoliday = async (req, res) => {
  try {
    const { date, description, holidayPlanId, createdBy } = req.body;
    const newHoliday = await Holiday.create({
      date,
      description,
      holidayPlanId,
      createdBy
    });

    res.status(201).json(newHoliday);
  } catch (error) {
    console.error("❌ Error creating holiday:", error);
    res.status(500).send("Error creating holiday: " + error.message);
  }
};

// Read All (with associated HolidayPlan)
exports.getAllHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.findAll({
      include: [{ model: HolidayPlan }]
    });
    res.json(holidays);
  } catch (error) {
    res.status(500).send("Error fetching holidays: " + error.message);
  }
};

// Read One by ID
exports.getHolidayById = async (req, res) => {
  try {
    const holiday = await Holiday.findOne({
      where: { id: req.params.id },
      include: [{ model: HolidayPlan }]
    });
    if (!holiday) return res.status(404).send("Holiday not found");
    res.json(holiday);
  } catch (error) {
    res.status(500).send("Error fetching holiday: " + error.message);
  }
};

// Update
exports.updateHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findOne({ where: { id: req.params.id } });
    if (!holiday) return res.status(404).send("Holiday not found");

    await holiday.update({ ...req.body, updatedBy: req.body.updatedBy });
    res.json(holiday);
  } catch (error) {
    console.error("❌ Error updating holiday:", error);
    res.status(500).send("Error updating holiday: " + error.message);
  }
};

// Delete (hard delete)
exports.deleteHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findOne({ where: { id: req.params.id } });
    if (!holiday) return res.status(404).send("Holiday not found");

    await holiday.destroy();
    res.json({ message: "Holiday deleted successfully" });
  } catch (error) {
    res.status(500).send("Error deleting holiday: " + error.message);
  }
};
