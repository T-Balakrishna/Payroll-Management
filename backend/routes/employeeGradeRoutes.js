import express from 'express';
const router = express.Router();
import * as employeeGradeController from '../controllers/employeeGradeController.js';
// Routes for employee grades
// Frontend should call: /api/employeeGrades   (camelCase plural)
router.get('/', employeeGradeController.getAllEmployeeGrades);
router.get('/:id', employeeGradeController.getEmployeeGradeById);
router.post('/', employeeGradeController.createEmployeeGrade);
router.put('/:id', employeeGradeController.updateEmployeeGrade);
router.delete('/:id', employeeGradeController.deleteEmployeeGrade);

export default router;