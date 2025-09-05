const HolidayPlan = require('../models/HolidayPlan'); // Sequelize model

// Create
exports.createHolidayPlan = async (req, res) => {
  try {
    const { name, createdBy } = req.body;
    const newPlan = await HolidayPlan.create({
      name,
      createdBy
    });

    res.status(201).json(newPlan);
  } catch (error) {
    console.error("❌ Error creating holiday plan:", error);
    res.status(500).send("Error creating holiday plan: " + error.message);
  }
};

// Read All
exports.getAllHolidayPlans = async (req, res) => {
  try {
    const plans = await HolidayPlan.findAll({where : {status:'active'}});
    res.json(plans);
  } catch (error) {
    res.status(500).send("Error fetching holiday plans: " + error.message);
  }
};

// Read One by ID
exports.getHolidayPlanById = async (req, res) => {
  try {
    const plan = await HolidayPlan.findOne({ where: { id: req.params.id } });
    if (!plan) return res.status(404).send("Holiday plan not found");
    res.json(plan);
  } catch (error) {
    res.status(500).send("Error fetching holiday plan: " + error.message);
  }
};

// Update
exports.updateHolidayPlan = async (req, res) => {
  try {
    const plan = await HolidayPlan.findOne({ where: { id: req.params.id } });
    if (!plan) return res.status(404).send("Holiday plan not found");

    await plan.update({ ...req.body, updatedBy: req.body.updatedBy });
    res.json(plan);
  } catch (error) {
    console.error("❌ Error updating holiday plan:", error);
    res.status(500).send("Error updating holiday plan: " + error.message);
  }
};

// Delete (hard delete)
exports.deleteHolidayPlan = async (req, res) => {
  try {
    const plan = await HolidayPlan.findOne({ where: { id: req.params.id } });
    if (!plan) return res.status(404).send("Holiday plan not found");

    await plan.destroy();
    res.json({ message: "Holiday plan deleted successfully" });
  } catch (error) {
    res.status(500).send("Error deleting holiday plan: " + error.message);
  }
};
