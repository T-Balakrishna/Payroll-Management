import express from 'express';
const router = express.Router();
import * as salaryGenerationController from '../controllers/salaryGenerationController.js';
// Routes for salary generations
// Frontend should call: /api/salaryGenerations
router.get('/', salaryGenerationController.getAllSalaryGenerations);
router.post('/generate-monthly', salaryGenerationController.generateMonthlySalary);
router.get('/download-spreadsheet', salaryGenerationController.downloadSalaryGenerationSpreadsheet);
router.get('/:id', salaryGenerationController.getSalaryGenerationById);
router.post('/', salaryGenerationController.createSalaryGeneration);
router.put('/:id', salaryGenerationController.updateSalaryGeneration);
router.delete('/:id', salaryGenerationController.deleteSalaryGeneration);

export default router;
