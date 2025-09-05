const Punch = require('../models/Punch');
const Employee = require('../models/Employee');
const BiometricDevice = require('../models/BiometricDevice');

// Log a punch
exports.createPunch = async (req, res) => {
  try {
    const { biometricId, employeeId, deviceId, punchTimestamp, createdBy } = req.body;
    const newPunch = await Punch.create({ biometricId, employeeId, deviceId, punchTimestamp, createdBy });
    res.status(201).json(newPunch);
  } catch (error) {
    res.status(500).send("Error creating punch: " + error.message);
  }
};

// Get all punches
exports.getAllPunches = async (req, res) => {
  try {
    const punches = await Punch.findAll({
      include: [
        { model: Employee, attributes: ['employeeName', 'employeeId'] },
        { model: BiometricDevice, attributes: ['deviceName', 'ipAddress', 'location'] }
      ],
      order: [['punchTimestamp', 'DESC']]
    });
    res.json(punches);
  } catch (error) {
    res.status(500).send("Error fetching punches: " + error.message);
  }
};

// Get punch by ID
exports.getPunchById = async (req, res) => {
  try {
    const punch = await Punch.findOne({
      where: { punchId: req.params.id },
      include: [
        { model: Employee, attributes: ['employeeName', 'employeeId'] },
        { model: BiometricDevice, attributes: ['deviceName', 'ipAddress', 'location'] }
      ]
    });
    if (!punch) return res.status(404).send("Punch not found");
    res.json(punch);
  } catch (error) {
    res.status(500).send("Error fetching punch: " + error.message);
  }
};

// Update punch
exports.updatePunch = async (req, res) => {
  try {
    const punch = await Punch.findOne({ where: { punchId: req.params.id } });
    if (!punch) return res.status(404).send("Punch not found");

    await punch.update(req.body);
    res.json(punch);
  } catch (error) {
    res.status(500).send("Error updating punch: " + error.message);
  }
};

// Delete punch
exports.deletePunch = async (req, res) => {
  try {
    const punch = await Punch.findOne({ where: { punchId: req.params.id } });
    if (!punch) return res.status(404).send("Punch not found");

    await punch.destroy();
    res.json({ message: "Punch deleted successfully" });
  } catch (error) {
    res.status(500).send("Error deleting punch: " + error.message);
  }
};
