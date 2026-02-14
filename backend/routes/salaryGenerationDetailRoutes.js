import express from 'express';
const router = express.Router();
import * as salaryGenerationDetailController from '../controllers/salaryGenerationDetailController.js';
// Routes for salary generation details
// Frontend should call: /api/salaryGenerationDetails
router.get('/', salaryGenerationDetailController.getAllSalaryGenerationDetails);
router.get('/:id', salaryGenerationDetailController.getSalaryGenerationDetailById);
router.post('/', salaryGenerationDetailController.createSalaryGenerationDetail);
router.put('/:id', salaryGenerationDetailController.updateSalaryGenerationDetail);
router.delete('/:id', salaryGenerationDetailController.deleteSalaryGenerationDetail);

export default router;