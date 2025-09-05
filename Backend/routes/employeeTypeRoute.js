const express = require('express');
const router = express.Router();
const {
  createEmployeeType,
  getAllEmployeeTypes,
  getEmployeeTypeById,
  updateEmployeeType,
  deleteEmployeeType
} = require('../controllers/employeeTypeController');

router.post('/', createEmployeeType);
router.get('/', getAllEmployeeTypes);
router.get('/:id', getEmployeeTypeById);
router.put('/:id', updateEmployeeType);
router.delete('/:id', deleteEmployeeType);

module.exports = router;
