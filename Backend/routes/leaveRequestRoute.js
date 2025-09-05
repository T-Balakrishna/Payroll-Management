const express = require('express');
const router = express.Router();
const {
  applyLeave,
  getLeavesByEmployee,
  updateLeaveStatus,
  getPendingLeaveRequests
} = require('../controllers/leaveRequestController');

router.post('/', applyLeave);
router.get('/employee/:id', getLeavesByEmployee);
router.put('/:id/status', updateLeaveStatus);
router.get('/pending', getPendingLeaveRequests);

module.exports = router;
