import express from 'express';
const router = express.Router();
import * as biometricDeviceController from '../controllers/biometricDeviceController.js';
// Routes for biometric devices
// Frontend should call: /api/biometricDevices   (camelCase plural)
router.get('/', biometricDeviceController.getAllBiometricDevices);
router.get('/:id', biometricDeviceController.getBiometricDeviceById);
router.post('/', biometricDeviceController.createBiometricDevice);
router.put('/:id', biometricDeviceController.updateBiometricDevice);
router.delete('/:id', biometricDeviceController.deleteBiometricDevice);

export default router;