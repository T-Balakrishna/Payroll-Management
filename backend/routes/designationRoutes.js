import express from 'express';
const router = express.Router();
import * as designationController from '../controllers/designationController.js';
import { cacheJsonResponse } from '../middleware/cacheResponse.js';
import { CACHE_PREFIXES } from '../services/cacheKeys.js';
// Routes for designations
// Frontend should call: /api/designations   (camelCase plural)
router.get('/', cacheJsonResponse({ prefix: CACHE_PREFIXES.designations, ttlSeconds: 300 }), designationController.getAllDesignations);
router.get('/:id', cacheJsonResponse({ prefix: CACHE_PREFIXES.designations, ttlSeconds: 300 }), designationController.getDesignationById);
router.post('/', designationController.createDesignation);
router.put('/:id', designationController.updateDesignation);
router.delete('/:id', designationController.deleteDesignation);

export default router;
