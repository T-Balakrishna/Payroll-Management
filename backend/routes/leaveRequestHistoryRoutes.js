import express from 'express';
const router = express.Router();
import * as leaveRequestHistoryController from '../controllers/leaveRequestHistoryController.js';
// Routes for leave request histories
router.get('/', leaveRequestHistoryController.getAllLeaveRequestHistories);
router.get('/:id', leaveRequestHistoryController.getLeaveRequestHistoryById);
router.post('/', leaveRequestHistoryController.createLeaveRequestHistory);

// No PUT or DELETE — history is append-only

export default router;