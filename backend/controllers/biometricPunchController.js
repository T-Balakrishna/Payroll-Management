const { BiometricPunch } = require('../models');

// Get all biometric punches (in production: always use strong filters!)
exports.getAllBiometricPunches = async (req, res) => {
  try {
    const biometricPunches = await BiometricPunch.findAll({
      include: [
        { model: require('../models').Employee,       as: 'employee' },
        { model: require('../models').BiometricDevice, as: 'device' },
        { model: require('../models').Company,        as: 'company' },
        { model: require('../models').User,           as: 'creator' },
      ]
    });
    res.json(biometricPunches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single biometric punch by ID
exports.getBiometricPunchById = async (req, res) => {
  try {
    const biometricPunch = await BiometricPunch.findByPk(req.params.id, {
      include: [
        { model: require('../models').Employee,       as: 'employee' },
        { model: require('../models').BiometricDevice, as: 'device' },
        { model: require('../models').Company,        as: 'company' },
        { model: require('../models').User,           as: 'creator' },
      ]
    });

    if (!biometricPunch) {
      return res.status(404).json({ message: 'Biometric punch record not found' });
    }

    res.json(biometricPunch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new biometric punch record
// (usually done by device sync service, not directly by user)
exports.createBiometricPunch = async (req, res) => {
  try {
    const biometricPunch = await BiometricPunch.create(req.body);
    res.status(201).json(biometricPunch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update biometric punch (e.g. manual correction, change punchType, add remarks, etc.)
exports.updateBiometricPunch = async (req, res) => {
  try {
    const [updated] = await BiometricPunch.update(req.body, {
      where: { punchId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Biometric punch record not found' });
    }

    const biometricPunch = await BiometricPunch.findByPk(req.params.id);
    res.json(biometricPunch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete biometric punch record (soft delete if paranoid: true)
exports.deleteBiometricPunch = async (req, res) => {
  try {
    const deleted = await BiometricPunch.destroy({
      where: { punchId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Biometric punch record not found' });
    }

    res.json({ message: 'Biometric punch record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};