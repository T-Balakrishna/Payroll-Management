const express = require('express');
const router = express.Router();
const employeeTypeController = require('../controllers/employeeTypeController');

// CRUD routes
router.post('/', employeeTypeController.createEmployeeType);
router.get('/', employeeTypeController.getAllEmployeeTypes);
router.get('/:id', employeeTypeController.getEmployeeTypeById);
router.put('/:id', employeeTypeController.updateEmployeeType);
router.delete('/:id', employeeTypeController.deleteEmployeeType);

module.exports = router;
