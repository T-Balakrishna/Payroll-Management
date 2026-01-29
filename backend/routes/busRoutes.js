const express = require('express');
const router = express.Router();
const busController = require('../controllers/busController');

// Routes for buses
// Frontend should call: /api/buses   (camelCase plural)
router.get('/', busController.getAllBuses);
router.get('/:id', busController.getBusById);
router.post('/', busController.createBus);
router.put('/:id', busController.updateBus);
router.delete('/:id', busController.deleteBus);

module.exports = router;