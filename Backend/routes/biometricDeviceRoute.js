const express = require('express');
const router = express.Router();

const {
    createDevice,
    getAllDevices,
    getDeviceById,
    updateDevice,
    deleteDevice
} = require('../controllers/biometricDeviceController');

// CRUD Routes
router.post('/', createDevice);        // Create
router.get('/', getAllDevices);        // Read All
router.get('/:id', getDeviceById);     // Read One
router.put('/:id', updateDevice);      // Update
router.delete('/:id', deleteDevice);   // Soft Delete

module.exports = router;
