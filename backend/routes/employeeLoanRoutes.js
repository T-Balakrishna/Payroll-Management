import express from 'express';
const router = express.Router();
import * as employeeLoanController from '../controllers/employeeLoanController.js';
// Routes for employee loans
// Frontend should call: /api/employeeLoans
router.get('/', employeeLoanController.getAllEmployeeLoans);
router.get('/:id', employeeLoanController.getEmployeeLoanById);
router.post('/', employeeLoanController.createEmployeeLoan);
router.put('/:id', employeeLoanController.updateEmployeeLoan);
router.delete('/:id', employeeLoanController.deleteEmployeeLoan);

export default router;