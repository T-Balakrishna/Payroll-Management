import express from 'express';
const router = express.Router();
import * as roleController from '../controllers/roleController.js';
import { cacheJsonResponse } from '../middleware/cacheResponse.js';
import { CACHE_PREFIXES } from '../services/cacheKeys.js';
// Routes for roles
// Frontend should call: /api/roles
router.get('/', cacheJsonResponse({ prefix: CACHE_PREFIXES.roles, ttlSeconds: 300 }), roleController.getAllRoles);
router.get('/:id', cacheJsonResponse({ prefix: CACHE_PREFIXES.roles, ttlSeconds: 300 }), roleController.getRoleById);
router.post('/', roleController.createRole);
router.put('/:id', roleController.updateRole);
router.delete('/:id', roleController.deleteRole);

export default router;
