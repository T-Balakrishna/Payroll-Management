const BiometricDevice = require("../models/BiometricDevice");

// Create Biometric Device
exports.createBiometricDevice = async (req, res) => {
  try {
    const { deviceIp, location, status, createdBy } = req.body;

    const device = await BiometricDevice.create({
      deviceIp,
      location,
      status,
      createdBy,
      updatedBy: createdBy
    });

    res.status(201).json(device);
  } catch (err) {
    console.error("❌ Error creating biometric device:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get all devices
exports.getAllBiometricDevices = async (req, res) => {
  try {
    const devices = await BiometricDevice.findAll({where: {status:'active'}});
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get device by deviceId
exports.getBiometricDeviceById = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await BiometricDevice.findByPk(deviceId);

    if (!device) return res.status(404).json({ error: "Device not found" });

    res.json(device);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update device
exports.updateBiometricDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { deviceIp, location, status, updatedBy } = req.body;

    const device = await BiometricDevice.findByPk(deviceId);
    if (!device) return res.status(404).json({ error: "Device not found" });

    await device.update({ deviceIp, location, status, updatedBy });
    res.json(device);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get device by deviceIp
exports.getBiometricDeviceByIp = async (req, res) => {
  try {
    const { deviceIp } = req.params;
    const device = await BiometricDevice.findOne({ where: { deviceIp, status: 'active' } });

    if (!device) return res.status(404).json({ error: "Device not found" });

    res.json(device);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete device
exports.deleteBiometricDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await BiometricDevice.findByPk(deviceId);
    if (!device) return res.status(404).json({ error: "Device not found" });

    await device.update({status:'inactive'});
    res.json({ message: "Device deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
