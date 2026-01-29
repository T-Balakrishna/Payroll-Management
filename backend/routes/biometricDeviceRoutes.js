const express = require('express');
const router = express.Router();
const biometricDeviceController = require('../controllers/biometricDeviceController');

// Routes for biometric devices
// Frontend should call: /api/biometricDevices   (camelCase plural)
router.get('/', biometricDeviceController.getAllBiometricDevices);
router.get('/:id', biometricDeviceController.getBiometricDeviceById);
router.post('/', biometricDeviceController.createBiometricDevice);
router.put('/:id', biometricDeviceController.updateBiometricDevice);
router.delete('/:id', biometricDeviceController.deleteBiometricDevice);

module.exports = router;