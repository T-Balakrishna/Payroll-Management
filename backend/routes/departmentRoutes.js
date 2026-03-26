import express from 'express';
const router = express.Router();

import * as departmentController from '../controllers/departmentController.js';
import { cacheJsonResponse } from '../middleware/cacheResponse.js';
import { CACHE_PREFIXES } from '../services/cacheKeys.js';
router.get('/', cacheJsonResponse({ prefix: CACHE_PREFIXES.departments, ttlSeconds: 300 }), departmentController.getAllDepartments);
router.get('/:id', cacheJsonResponse({ prefix: CACHE_PREFIXES.departments, ttlSeconds: 300 }), departmentController.getDepartmentById);
router.post('/', departmentController.createDepartment);
router.put('/:id', departmentController.updateDepartment);
router.delete('/:id', departmentController.deleteDepartment);

export default router;
