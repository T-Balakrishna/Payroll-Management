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
router.post('/', createBus);        // Create
router.get('/', getAllBuses);       // Read All (active)
router.get('/:id', getBusById);     // Read One by ID (active)
router.put('/:id', updateBus);      // Update
router.delete('/:id', deleteBus);   // Soft Delete (set status inactive)

module.exports = router;
