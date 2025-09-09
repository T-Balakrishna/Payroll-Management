const Biometric = require("../models/Biometric");
const Employee = require("../models/Employee");

// Create new biometric entry
exports.createBiometric = async (req, res) => {
  try {
    const { biometricNumber, employeeNumber } = req.body;

    const newBio = await Biometric.create({ biometricNumber, employeeNumber });
    res.status(201).json(newBio);
  } catch (err) {
    console.error("❌ Error creating biometric:", err);
    res.status(500).send("Error creating biometric: " + err.message);
  }
};

// Get all biometrics
exports.getAllBiometrics = async (req, res) => {
  try {
    const biometrics = await Biometric.findAll({
      include: [{ model: Employee, attributes: ["employeeName", "department"] }]
    });
    res.json(biometrics);
  } catch (err) {
    res.status(500).send("Error fetching biometrics: " + err.message);
  }
};

// Get biometric by ID
exports.getBiometricById = async (req, res) => {
  try {
    const bio = await Biometric.findOne({
      where: { biometricId: req.params.id },
      include: [{ model: Employee, attributes: ["employeeName", "department"] }]
    });
    if (!bio) return res.status(404).send("Biometric not found");
    res.json(bio);
  } catch (err) {
    res.status(500).send("Error fetching biometric: " + err.message);
  }
};

// Update biometric
exports.updateBiometric = async (req, res) => {
  try {
    const bio = await Biometric.findOne({ where: { biometricId: req.params.id } });
    if (!bio) return res.status(404).send("Biometric not found");

    await bio.update(req.body);
    res.json(bio);
  } catch (err) {
    res.status(500).send("Error updating biometric: " + err.message);
  }
};

// Delete biometric (soft delete optional)
exports.deleteBiometric = async (req, res) => {
  try {
    const bio = await Biometric.findOne({ where: { biometricId: req.params.id } });
    if (!bio) return res.status(404).send("Biometric not found");

    await bio.destroy();
    res.json({ message: "Biometric deleted successfully" });
  } catch (err) {
    res.status(500).send("Error deleting biometric: " + err.message);
  }
};
