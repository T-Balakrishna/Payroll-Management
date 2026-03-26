import express from 'express';
const router = express.Router();
import * as leaveTypeController from '../controllers/leaveTypeController.js';
import { cacheJsonResponse } from '../middleware/cacheResponse.js';
import { CACHE_PREFIXES } from '../services/cacheKeys.js';
// Routes for leave types
// Frontend should call: /api/leaveTypes
router.get('/', cacheJsonResponse({ prefix: CACHE_PREFIXES.leaveTypes, ttlSeconds: 300 }), leaveTypeController.getAllLeaveTypes);
router.get('/:id', cacheJsonResponse({ prefix: CACHE_PREFIXES.leaveTypes, ttlSeconds: 300 }), leaveTypeController.getLeaveTypeById);
router.post('/', leaveTypeController.createLeaveType);
router.put('/:id', leaveTypeController.updateLeaveType);
router.delete('/:id', leaveTypeController.deleteLeaveType);

export default router; 
