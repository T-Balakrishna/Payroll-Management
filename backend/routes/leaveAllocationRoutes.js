import express from 'express';
const router = express.Router();
import * as leaveAllocationController from '../controllers/leaveAllocationController.js';
// Routes for leave allocations
// Frontend should call: /api/leaveAllocations
router.get('/', leaveAllocationController.getAllLeaveAllocations);
router.get('/:id', leaveAllocationController.getLeaveAllocationById);
router.post('/', leaveAllocationController.createLeaveAllocation);
router.put('/:id', leaveAllocationController.updateLeaveAllocation);
router.delete('/:id', leaveAllocationController.deleteLeaveAllocation);

export default router;