const express = require('express');
const router = express.Router();
const employeeSalaryMasterController = require('../controllers/employeeSalaryMasterController');

// Routes for employee salary masters
// Frontend calls: /api/employeeSalaryMasters
router.get('/', employeeSalaryMasterController.getAllEmployeeSalaryMasters);
router.get('/:id', employeeSalaryMasterController.getEmployeeSalaryMasterById);
router.post('/', employeeSalaryMasterController.createEmployeeSalaryMaster);
router.put('/:id', employeeSalaryMasterController.updateEmployeeSalaryMaster);
router.delete('/:id', employeeSalaryMasterController.deleteEmployeeSalaryMaster);

module.exports = router;