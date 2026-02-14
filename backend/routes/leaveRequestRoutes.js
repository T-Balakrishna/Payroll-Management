import express from 'express';
const router = express.Router();
import * as leaveRequestController from '../controllers/leaveRequestController.js';
// Routes for leave requests
router.get('/', leaveRequestController.getAllLeaveRequests);
router.get('/:id', leaveRequestController.getLeaveRequestById);
router.post('/', leaveRequestController.createLeaveRequest);
router.put('/:id', leaveRequestController.updateLeaveRequest);
router.delete('/:id', leaveRequestController.deleteLeaveRequest);

export default router;