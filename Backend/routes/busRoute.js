const express = require('express');
const router = express.Router();

const {
    createBus,
    getAllBuses,
    getBusById,
    updateBus,
    deleteBus
} = require('../controllers/busController');

// CRUD Routes
router.post('/', createBus);       // Create
router.get('/', getAllBuses);      // Read All
router.get('/:id', getBusById);    // Read One
router.put('/:id', updateBus);     // Update
router.delete('/:id', deleteBus);  // Delete

module.exports = router;
