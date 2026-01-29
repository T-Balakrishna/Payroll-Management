const express = require('express');
const router = express.Router();
const leaveRequestHistoryController = require('../controllers/leaveRequestHistoryController');

// Routes for leave request histories
router.get('/', leaveRequestHistoryController.getAllLeaveRequestHistories);
router.get('/:id', leaveRequestHistoryController.getLeaveRequestHistoryById);
router.post('/', leaveRequestHistoryController.createLeaveRequestHistory);

// No PUT or DELETE — history is append-only

module.exports = router;