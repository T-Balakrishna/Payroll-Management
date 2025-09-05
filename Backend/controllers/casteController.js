const Caste = require('../models/Caste'); // Sequelize model

// Create
exports.createCaste = async (req, res) => {
  try {
    const { casteName, createdBy } = req.body;
    const newCaste = await Caste.create({
      casteName,
      createdBy
    });

    res.status(201).json(newCaste);
  } catch (error) {
    console.error("❌ Error creating caste:", error);
    res.status(500).send("Error creating caste: " + error.message);
  }
};

// Read All (only active)
exports.getAllCastes = async (req, res) => {
  try {
    const castes = await Caste.findAll({ where: { status: 'active' } });
    res.json(castes);
  } catch (error) {
    res.status(500).send("Error fetching castes: " + error.message);
  }
};

// Read One by ID (only active)
exports.getCasteById = async (req, res) => {
  try {
    const caste = await Caste.findOne({ 
      where: { casteId: req.params.id, status: 'active' } 
    });
    if (!caste) return res.status(404).send("Caste not found or inactive");
    res.json(caste);
  } catch (error) {
    res.status(500).send("Error fetching caste: " + error.message);
  }
};

// Update
exports.updateCaste = async (req, res) => {
  try {
    const caste = await Caste.findOne({ where: { casteId: req.params.id, status: 'active' } });
    if (!caste) return res.status(404).send("Caste not found or inactive");

    await caste.update({ ...req.body, updatedBy: req.body.updatedBy });
    res.json(caste);
  } catch (error) {
    console.error("❌ Error updating caste:", error);
    res.status(500).send("Error updating caste: " + error.message);
  }
};

// Soft Delete (set status to inactive)
exports.deleteCaste = async (req, res) => {
  try {
    const caste = await Caste.findOne({ where: { casteId: req.params.id, status: 'active' } });
    if (!caste) return res.status(404).send("Caste not found or already inactive");

    await caste.update({ status: 'inactive', updatedBy: req.body.updatedBy });
    res.json({ message: "Caste deactivated successfully" });
  } catch (error) {
    res.status(500).send("Error deleting caste: " + error.message);
  }
};
