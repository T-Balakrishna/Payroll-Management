const express = require('express');
const router = express.Router();

const {
  applyLeave,
  getLeavesByEmployee,
  updateLeaveStatus,
  getPendingLeaveRequests
} = require('../controllers/leaveController');

// Apply leave
router.post('/', applyLeave);

// Get all leaves for employee
router.get('/employee/:id', getLeavesByEmployee);

// Approve / Reject leave
router.put('/:id/status', updateLeaveStatus);

// Get all pending leave requests (admin view)
router.get('/pending', getPendingLeaveRequests);

module.exports = router;
