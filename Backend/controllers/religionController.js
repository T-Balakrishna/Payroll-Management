const Religion = require('../models/Religion'); // Sequelize model

// Create
exports.createReligion = async (req, res) => {
  try {
    const { religionName, createdBy } = req.body;
    const newReligion = await Religion.create({
      religionName,
      createdBy
    });

    res.status(201).json(newReligion);
  } catch (error) {
    console.error("❌ Error creating religion:", error);
    res.status(500).send("Error creating religion: " + error.message);
  }
};

// Read All (only active)
exports.getAllReligions = async (req, res) => {
  try {
    const religions = await Religion.findAll({ where: { status: 'active' } });
    res.json(religions);
  } catch (error) {
    res.status(500).send("Error fetching religions: " + error.message);
  }
};

// Read One by ID (only active)
exports.getReligionById = async (req, res) => {
  try {
    const religion = await Religion.findOne({ 
      where: { religionId: req.params.id, status: 'active' } 
    });
    if (!religion) return res.status(404).send("Religion not found or inactive");
    res.json(religion);
  } catch (error) {
    res.status(500).send("Error fetching religion: " + error.message);
  }
};

// Update
exports.updateReligion = async (req, res) => {
  try {
    const religion = await Religion.findOne({ where: { religionId: req.params.id, status: 'active' } });
    if (!religion) return res.status(404).send("Religion not found or inactive");

    await religion.update({ ...req.body, updatedBy: req.body.updatedBy });
    res.json(religion);
  } catch (error) {
    console.error("❌ Error updating religion:", error);
    res.status(500).send("Error updating religion: " + error.message);
  }
};

// Soft Delete (set status to inactive)
exports.deleteReligion = async (req, res) => {
  try {
    const religion = await Religion.findOne({ where: { religionId: req.params.id, status: 'active' } });
    if (!religion) return res.status(404).send("Religion not found or already inactive");

    await religion.update({ status: 'inactive', updatedBy: req.body.updatedBy });
    res.json({ message: "Religion deactivated successfully" });
  } catch (error) {
    res.status(500).send("Error deleting religion: " + error.message);
  }
};
