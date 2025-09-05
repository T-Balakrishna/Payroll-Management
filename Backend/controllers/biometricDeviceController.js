const BiometricDevice = require('../models/BiometricDevice');

// Create a new device
exports.createDevice = async (req, res) => {
  try {
    const { deviceName, ipAddress, location, deviceType, createdBy } = req.body;
    const newDevice = await BiometricDevice.create({ deviceName, ipAddress, location, deviceType, createdBy });
    res.status(201).json(newDevice);
  } catch (error) {
    res.status(500).send("Error creating device: " + error.message);
  }
};

// Get all active devices
exports.getAllDevices = async (req, res) => {
  try {
    const devices = await BiometricDevice.findAll({ where: { status: 'active' } });
    res.json(devices);
  } catch (error) {
    res.status(500).send("Error fetching devices: " + error.message);
  }
};

// Get device by ID
exports.getDeviceById = async (req, res) => {
  try {
    const device = await BiometricDevice.findOne({ where: { deviceId: req.params.id, status: 'active' } });
    if (!device) return res.status(404).send("Device not found or inactive");
    res.json(device);
  } catch (error) {
    res.status(500).send("Error fetching device: " + error.message);
  }
};

// Update device
exports.updateDevice = async (req, res) => {
  try {
    const device = await BiometricDevice.findOne({ where: { deviceId: req.params.id, status: 'active' } });
    if (!device) return res.status(404).send("Device not found or inactive");

    await device.update(req.body);
    res.json(device);
  } catch (error) {
    res.status(500).send("Error updating device: " + error.message);
  }
};

// Soft delete
exports.deleteDevice = async (req, res) => {
  try {
    const device = await BiometricDevice.findOne({ where: { deviceId: req.params.id, status: 'active' } });
    if (!device) return res.status(404).send("Device not found or already inactive");

    await device.update({ status: 'inactive', updatedBy: req.body.updatedBy });
    res.json({ message: "Device deactivated successfully" });
  } catch (error) {
    res.status(500).send("Error deleting device: " + error.message);
  }
};
