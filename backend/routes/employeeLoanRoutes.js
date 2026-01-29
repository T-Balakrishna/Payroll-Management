const express = require('express');
const router = express.Router();
const employeeLoanController = require('../controllers/employeeLoanController');

// Routes for employee loans
// Frontend should call: /api/employeeLoans
router.get('/', employeeLoanController.getAllEmployeeLoans);
router.get('/:id', employeeLoanController.getEmployeeLoanById);
router.post('/', employeeLoanController.createEmployeeLoan);
router.put('/:id', employeeLoanController.updateEmployeeLoan);
router.delete('/:id', employeeLoanController.deleteEmployeeLoan);

module.exports = router;