const express = require('express');
const router = express.Router();
const employeeGradeController = require('../controllers/employeeGradeController');

// Routes for employee grades
// Frontend should call: /api/employeeGrades   (camelCase plural)
router.get('/', employeeGradeController.getAllEmployeeGrades);
router.get('/:id', employeeGradeController.getEmployeeGradeById);
router.post('/', employeeGradeController.createEmployeeGrade);
router.put('/:id', employeeGradeController.updateEmployeeGrade);
router.delete('/:id', employeeGradeController.deleteEmployeeGrade);

module.exports = router;