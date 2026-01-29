const express = require('express');
const router = express.Router();
const leaveAllocationController = require('../controllers/leaveAllocationController');

// Routes for leave allocations
// Frontend should call: /api/leaveAllocations
router.get('/', leaveAllocationController.getAllLeaveAllocations);
router.get('/:id', leaveAllocationController.getLeaveAllocationById);
router.post('/', leaveAllocationController.createLeaveAllocation);
router.put('/:id', leaveAllocationController.updateLeaveAllocation);
router.delete('/:id', leaveAllocationController.deleteLeaveAllocation);

module.exports = router;