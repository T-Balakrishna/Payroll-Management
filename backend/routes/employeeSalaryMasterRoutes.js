import express from 'express';
const router = express.Router();
import * as employeeSalaryMasterController from '../controllers/employeeSalaryMasterController.js';
// Routes for employee salary masters
// Frontend calls: /api/employeeSalaryMasters
router.get('/', employeeSalaryMasterController.getAllEmployeeSalaryMasters);
router.post('/assign-earning-component', employeeSalaryMasterController.assignEarningComponentToEmployee);
router.post('/sync-formula-components', employeeSalaryMasterController.syncFormulaComponentsForEmployee);
router.get('/:id', employeeSalaryMasterController.getEmployeeSalaryMasterById);
router.post('/', employeeSalaryMasterController.createEmployeeSalaryMaster);
router.put('/:id', employeeSalaryMasterController.updateEmployeeSalaryMaster);
router.delete('/:id', employeeSalaryMasterController.deleteEmployeeSalaryMaster);

export default router;
