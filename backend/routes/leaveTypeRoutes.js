import express from 'express';
const router = express.Router();
import * as leaveTypeController from '../controllers/leaveTypeController.js';
// Routes for leave types
// Frontend should call: /api/leaveTypes
router.get('/', leaveTypeController.getAllLeaveTypes);
router.get('/:id', leaveTypeController.getLeaveTypeById);
router.post('/', leaveTypeController.createLeaveType);
router.put('/:id', leaveTypeController.updateLeaveType);
router.delete('/:id', leaveTypeController.deleteLeaveType);

export default router; 