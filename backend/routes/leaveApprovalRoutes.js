import express from 'express';
const router = express.Router();
import * as leaveApprovalController from '../controllers/leaveApprovalController.js';
// Routes for leave approvals
// Frontend should call: /api/leaveApprovals
router.get('/', leaveApprovalController.getAllLeaveApprovals);
router.get('/:id', leaveApprovalController.getLeaveApprovalById);
router.post('/', leaveApprovalController.createLeaveApproval);
router.put('/:id', leaveApprovalController.updateLeaveApproval);
router.delete('/:id', leaveApprovalController.deleteLeaveApproval);

export default router;