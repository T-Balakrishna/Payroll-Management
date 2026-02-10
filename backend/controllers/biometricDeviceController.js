const { BiometricDevice } = require('../models');

// Get all biometric devices (typically filtered by company in real usage)
exports.getAllBiometricDevices = async (req, res) => {
  try {
    const biometricDevices = await BiometricDevice.findAll({
      include: [
        { model: require('../models').Company, as: 'company' },
        
        // { model: require('../models').Employee, as: 'enrolledEmployees' }  // ← uncomment if you want to include enrolled employees list
      ]
    });
    res.json(biometricDevices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single biometric device by ID
exports.getBiometricDeviceById = async (req, res) => {
  try {
    const biometricDevice = await BiometricDevice.findByPk(req.params.id, {
      include: [
        { model: require('../models').Company, as: 'company' },
        
        // { model: require('../models').Employee, as: 'enrolledEmployees' }
      ]
    });

    if (!biometricDevice) {
      return res.status(404).json({ message: 'Biometric device not found' });
    }

    res.json(biometricDevice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new biometric device
exports.createBiometricDevice = async (req, res) => {
  try {
    const biometricDevice = await BiometricDevice.create(req.body);
    res.status(201).json(biometricDevice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update biometric device
exports.updateBiometricDevice = async (req, res) => {
  try {
    const [updated] = await BiometricDevice.update(req.body, {
      where: { deviceId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Biometric device not found' });
    }

    const biometricDevice = await BiometricDevice.findByPk(req.params.id);
    res.json(biometricDevice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete biometric device (soft delete if paranoid: true)
exports.deleteBiometricDevice = async (req, res) => {
  try {
    const deleted = await BiometricDevice.destroy({
      where: { deviceId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Biometric device not found' });
    }

    res.json({ message: 'Biometric device deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};