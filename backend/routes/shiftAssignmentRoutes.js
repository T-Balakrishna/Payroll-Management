const express = require('express');
const router = express.Router();
const shiftAssignmentController = require('../controllers/shiftAssignmentController');

// Routes for shift assignments
// Frontend should call: /api/shiftAssignments
router.get('/', shiftAssignmentController.getAllShiftAssignments);
router.get('/:id', shiftAssignmentController.getShiftAssignmentById);
router.post('/', shiftAssignmentController.createShiftAssignment);
router.put('/:id', shiftAssignmentController.updateShiftAssignment);
router.delete('/:id', shiftAssignmentController.deleteShiftAssignment);

module.exports = router;