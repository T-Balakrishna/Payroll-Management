const express = require('express');
const router = express.Router();
const salaryGenerationController = require('../controllers/salaryGenerationController');

// Routes for salaryGenerations
// Frontend should call: /api/salaryGenerations
router.get('/', salaryGenerationController.getAllSalaryGenerations);
router.get('/:id', salaryGenerationController.getSalaryGenerationById);
router.post('/', salaryGenerationController.createSalaryGeneration);
router.put('/:id', salaryGenerationController.updateSalaryGeneration);
router.delete('/:id', salaryGenerationController.deleteSalaryGeneration);

module.exports = router;
