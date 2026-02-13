const express = require('express');
const router = express.Router();
const biometricPunchController = require('../controllers/biometricPunchController');

// Routes for biometric punches
// Frontend should call: /api/biometricPunches   (camelCase plural)
router.get("/fetch", biometricPunchController.fetchPunches);
router.get('/', biometricPunchController.getAllBiometricPunches);
router.get('/:id', biometricPunchController.getBiometricPunchById);
router.post('/', biometricPunchController.createBiometricPunch);
router.put('/:id', biometricPunchController.updateBiometricPunch);
router.delete('/:id', biometricPunchController.deleteBiometricPunch);

module.exports = router;
