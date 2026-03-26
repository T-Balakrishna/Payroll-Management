import express from 'express';
const router = express.Router();
import * as employeeGradeController from '../controllers/employeeGradeController.js';
import { cacheJsonResponse } from '../middleware/cacheResponse.js';
import { CACHE_PREFIXES } from '../services/cacheKeys.js';
// Routes for employee grades
// Frontend should call: /api/employeeGrades   (camelCase plural)
router.get('/', cacheJsonResponse({ prefix: CACHE_PREFIXES.employeeGrades, ttlSeconds: 300 }), employeeGradeController.getAllEmployeeGrades);
router.get('/:id', cacheJsonResponse({ prefix: CACHE_PREFIXES.employeeGrades, ttlSeconds: 300 }), employeeGradeController.getEmployeeGradeById);
router.post('/', employeeGradeController.createEmployeeGrade);
router.put('/:id', employeeGradeController.updateEmployeeGrade);
router.delete('/:id', employeeGradeController.deleteEmployeeGrade);

export default router;
