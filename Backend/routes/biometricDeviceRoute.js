const express = require("express");
const router = express.Router();
const biometricDeviceController = require("../controllers/biometricDeviceController");

// CRUD Routes (deviceId used instead of id)
router.post("/", biometricDeviceController.createBiometricDevice);
router.get("/", biometricDeviceController.getAllBiometricDevices);
router.get("/:deviceId", biometricDeviceController.getBiometricDeviceById);
router.put("/:deviceId", biometricDeviceController.updateBiometricDevice);
router.delete("/:deviceId", biometricDeviceController.deleteBiometricDevice);

module.exports = router;
