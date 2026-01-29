const express = require('express');
const router = express.Router();
const employeeTypeController = require('../controllers/employeeTypeController');

// Routes for employee types
// Frontend should call: /api/employeeTypes   (camelCase plural)
router.get('/', employeeTypeController.getAllEmployeeTypes);
router.get('/:id', employeeTypeController.getEmployeeTypeById);
router.post('/', employeeTypeController.createEmployeeType);
router.put('/:id', employeeTypeController.updateEmployeeType);
router.delete('/:id', employeeTypeController.deleteEmployeeType);

module.exports = router;