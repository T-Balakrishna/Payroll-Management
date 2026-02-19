import express from 'express';
const router = express.Router();
import * as biometricPunchController from '../controllers/biometricPunchController.js';
// Routes for biometric punches
// Frontend should call: /api/biometricPunches   (camelCase plural)
router.get("/fetch", biometricPunchController.fetchPunches);
router.get('/', biometricPunchController.getAllBiometricPunches);
router.get('/:id', biometricPunchController.getBiometricPunchByStaffId);
router.post('/', biometricPunchController.createBiometricPunch);
router.put('/:id', biometricPunchController.updateBiometricPunch);
router.delete('/:id', biometricPunchController.deleteBiometricPunch);

export default router;
