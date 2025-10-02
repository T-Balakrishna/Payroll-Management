const BiometricDevice = require("../models/BiometricDevice");

// Create Biometric Device
exports.createBiometricDevice = async (req, res) => {
  try {
    const { deviceIp, location, status, createdBy, companyId } = req.body;

    if (!companyId) return res.status(400).json({ error: "Company ID is required" });

    const device = await BiometricDevice.create({
      deviceIp,
      location,
      status: status || "active",
      createdBy:createdBy,
      companyId
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
    const { companyId } = req.query;

    let whereClause = { status: "active" };
    if (companyId) whereClause.companyId = companyId; // restrict to specific company

    const devices = await BiometricDevice.findAll({ where: whereClause });
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
    const { deviceIp, location, status, updatedBy, companyId } = req.body;

    const device = await BiometricDevice.findByPk(deviceId);
    if (!device) return res.status(404).json({ error: "Device not found" });

    // Optional: enforce companyId check for Admins
    // if (companyId && device.companyId !== companyId) {
    //   return res.status(403).json({ error: "You cannot edit device from another company" });
    // }

    await device.update({ deviceIp, location, status, updatedBy,companyId });
    res.json(device);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete device
exports.deleteBiometricDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const {updatedBy}=req.body;
    const device = await BiometricDevice.findByPk(deviceId);
    if (!device) return res.status(404).json({ error: "Device not found" });

    await device.update({ status: "inactive",updatedBy });
    res.json({ message: "Device deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
