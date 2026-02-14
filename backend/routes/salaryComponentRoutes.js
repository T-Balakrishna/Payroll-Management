import express from 'express';
const router = express.Router();
import * as salaryComponentController from '../controllers/salaryComponentController.js';
// Routes for salary components
// Frontend should call: /api/salaryComponents
router.get('/', salaryComponentController.getAllSalaryComponents);
router.get('/:id', salaryComponentController.getSalaryComponentById);
router.post('/', salaryComponentController.createSalaryComponent);
router.put('/:id', salaryComponentController.updateSalaryComponent);
router.delete('/:id', salaryComponentController.deleteSalaryComponent);

export default router;