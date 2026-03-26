import express from 'express';
const router = express.Router();
import * as shiftTypeController from '../controllers/shiftTypeController.js';
import { cacheJsonResponse } from '../middleware/cacheResponse.js';
import { CACHE_PREFIXES } from '../services/cacheKeys.js';
// Routes for shift types
// Frontend should call: /api/shiftTypes
router.get('/', cacheJsonResponse({ prefix: CACHE_PREFIXES.shiftTypes, ttlSeconds: 300 }), shiftTypeController.getAllShiftTypes);
router.get('/:id', cacheJsonResponse({ prefix: CACHE_PREFIXES.shiftTypes, ttlSeconds: 300 }), shiftTypeController.getShiftTypeById);
router.post('/', shiftTypeController.createShiftType);
router.put('/:id', shiftTypeController.updateShiftType);
router.delete('/:id', shiftTypeController.deleteShiftType);

export default router;
