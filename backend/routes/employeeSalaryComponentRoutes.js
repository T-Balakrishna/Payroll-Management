import express from 'express';
const router = express.Router();
import * as employeeSalaryComponentController from '../controllers/employeeSalaryComponentController.js';
// Routes for employee salary components
// Frontend should call: /api/employeeSalaryComponents
router.get('/', employeeSalaryComponentController.getAllEmployeeSalaryComponents);
router.get('/:id', employeeSalaryComponentController.getEmployeeSalaryComponentById);
router.post('/', employeeSalaryComponentController.createEmployeeSalaryComponent);
router.put('/:id', employeeSalaryComponentController.updateEmployeeSalaryComponent);
router.delete('/:id', employeeSalaryComponentController.deleteEmployeeSalaryComponent);

export default router;