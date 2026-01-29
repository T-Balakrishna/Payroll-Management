const express = require('express');
const router = express.Router();
const leaveTypeController = require('../controllers/leaveTypeController');

// Routes for leave types
// Frontend should call: /api/leaveTypes
router.get('/', leaveTypeController.getAllLeaveTypes);
router.get('/:id', leaveTypeController.getLeaveTypeById);
router.post('/', leaveTypeController.createLeaveType);
router.put('/:id', leaveTypeController.updateLeaveType);
router.delete('/:id', leaveTypeController.deleteLeaveType);

module.exports = router;