import db from '../models/index.js';
const { BiometricDevice, Company } = db;
// Get all biometric devices
export const getAllBiometricDevices = async (req, res) => {
  try {
    const { companyId } = req.query;
    const where = {};
    if (companyId) where.companyId = companyId;

    const biometricDevices = await BiometricDevice.findAll({
      where,
      include: [{ model: Company, as: "company" }],
      order: [["name", "ASC"]],
    });
    res.json(biometricDevices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single biometric device by ID
export const getBiometricDeviceById = async (req, res) => {
  try {
    const biometricDevice = await BiometricDevice.findByPk(req.params.id, {
      include: [{ model: Company, as: "company" }],
    });

    if (!biometricDevice) {
      return res.status(404).json({ message: "Biometric device not found" });
    }

    res.json(biometricDevice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new biometric device
export const createBiometricDevice = async (req, res) => {
  try {
    const biometricDevice = await BiometricDevice.create(req.body);
    res.status(201).json(biometricDevice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update biometric device
export const updateBiometricDevice = async (req, res) => {
  try {
    const [updated] = await BiometricDevice.update(req.body, {
      where: { deviceId: req.params.id },
    });

    if (!updated) {
      return res.status(404).json({ message: "Biometric device not found" });
    }

    const biometricDevice = await BiometricDevice.findByPk(req.params.id);
    res.json(biometricDevice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete biometric device (soft delete if paranoid: true)
export const deleteBiometricDevice = async (req, res) => {
  try {
    const deleted = await BiometricDevice.destroy({
      where: { deviceId: req.params.id },
    });

    if (!deleted) {
      return res.status(404).json({ message: "Biometric device not found" });
    }

    res.json({ message: "Biometric device deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
