const express = require('express');
const router = express.Router();
const leaveApprovalController = require('../controllers/leaveApprovalController');

// Routes for leave approvals
// Frontend should call: /api/leaveApprovals
router.get('/', leaveApprovalController.getAllLeaveApprovals);
router.get('/:id', leaveApprovalController.getLeaveApprovalById);
router.post('/', leaveApprovalController.createLeaveApproval);
router.put('/:id', leaveApprovalController.updateLeaveApproval);
router.delete('/:id', leaveApprovalController.deleteLeaveApproval);

module.exports = router;