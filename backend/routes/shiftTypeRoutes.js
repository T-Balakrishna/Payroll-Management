const express = require('express');
const router = express.Router();
const shiftTypeController = require('../controllers/shiftTypeController');

// Routes for shift types
// Frontend should call: /api/shiftTypes
router.get('/', shiftTypeController.getAllShiftTypes);
router.get('/:id', shiftTypeController.getShiftTypeById);
router.post('/', shiftTypeController.createShiftType);
router.put('/:id', shiftTypeController.updateShiftType);
router.delete('/:id', shiftTypeController.deleteShiftType);

module.exports = router;