const Holiday = require('../models/Holiday'); // Sequelize model
const HolidayPlan = require('../models/HolidayPlan');

// Create
exports.createHoliday = async (req, res) => {
  try {
    const { holidayDate, description, holidayPlanId, createdBy } = req.body;

    const plan = await HolidayPlan.findByPk(holidayPlanId);
    if (!plan) return res.status(404).send("Holiday Plan not found");

    const holidayDateObj = new Date(holidayDate);
    if (holidayDateObj < new Date(plan.startDate) || holidayDateObj > new Date(plan.endDate)) {
      return res.status(400).send("Holiday date is outside the plan's date range");
    }

    const newHoliday = await Holiday.create({
      holidayDate,
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
      where: { holidayId: req.params.id },
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
    const holiday = await Holiday.findOne({ where: { holidayId: req.params.id } });
    if (!holiday) return res.status(404).send("Holiday not found");

    const { holidayDate } = req.body;
    if (holidayDate) {
      const plan = await HolidayPlan.findByPk(holiday.holidayPlanId);
      const holidayDateObj = new Date(holidayDate);
      if (holidayDateObj < new Date(plan.startDate) || holidayDateObj > new Date(plan.endDate)) {
        return res.status(400).send("Holiday date is outside the plan's date range");
      }
    }

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
    const holiday = await Holiday.findOne({ where: { holidayId: req.params.id } });
    if (!holiday) return res.status(404).send("Holiday not found");

    await holiday.destroy();
    res.json({ message: "Holiday deleted successfully" });
  } catch (error) {
    res.status(500).send("Error deleting holiday: " + error.message);
  }
};

exports.getAllHolidaysByPlan = async (req, res) => {
  try {
    const { holidayPlanId } = req.params;

    const holidays = await Holiday.findAll({
      where: { holidayPlanId },
      include: [
        {
          model: HolidayPlan,
          attributes: ['holidayPlanName', 'weeklyOff', 'startDate', 'endDate']
        }
      ],
      order: [['holidayDate', 'ASC']]
    });

    res.json(holidays);
  } catch (error) {
    console.error("Error fetching holidays by plan:", error);
    res.status(500).send("Error fetching holidays: " + error.message);
  }
};

exports.createHolidaysBulk = async (req, res) => {
  try {
    const holidays = req.body; // Expecting an array of { holidayPlanId, holidayDate, description, createdBy }
    console.log(holidays)
    if (!Array.isArray(holidays) || holidays.length === 0) {
      return res.status(400).send("No holidays provided for bulk insertion");
    }

    // Validate each holiday date against its plan
    for (let h of holidays) {
      const plan = await HolidayPlan.findByPk(h.holidayPlanId);
      if (!plan) return res.status(404).send(`Holiday Plan ${h.holidayPlanId} not found`);

      const holidayDateObj = new Date(h.holidayDate);
      if (holidayDateObj < new Date(plan.startDate) || holidayDateObj > new Date(plan.endDate)) {
        return res.status(400).send(`Holiday ${h.holidayDate} is outside plan ${plan.holidayPlanName} date range`);
      }
    }

    const createdHolidays = await Holiday.bulkCreate(holidays);

    res.status(201).json({
      message: `${createdHolidays.length} holidays created successfully`,
      holidays: createdHolidays
    });
  } catch (error) {
    console.error("❌ Error creating holidays in bulk:", error);
    res.status(500).send("Error creating holidays: " + error.message);
  }
};
