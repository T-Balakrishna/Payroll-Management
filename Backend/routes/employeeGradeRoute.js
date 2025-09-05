const express = require('express');
const router = express.Router();
const {
  createEmployeeGrade,
  getAllEmployeeGrades,
  getEmployeeGradeById,
  updateEmployeeGrade,
  deleteEmployeeGrade
} = require('../controllers/employeeGradeController');

router.post('/', createEmployeeGrade);
router.get('/', getAllEmployeeGrades);
router.get('/:id', getEmployeeGradeById);
router.put('/:id', updateEmployeeGrade);
router.delete('/:id', deleteEmployeeGrade);

module.exports = router;
