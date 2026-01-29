const express = require('express');
const router = express.Router();
const salaryGenerationDetailController = require('../controllers/salaryGenerationDetailController');

// Routes for salary generation details
// Frontend should call: /api/salaryGenerationDetails
router.get('/', salaryGenerationDetailController.getAllSalaryGenerationDetails);
router.get('/:id', salaryGenerationDetailController.getSalaryGenerationDetailById);
router.post('/', salaryGenerationDetailController.createSalaryGenerationDetail);
router.put('/:id', salaryGenerationDetailController.updateSalaryGenerationDetail);
router.delete('/:id', salaryGenerationDetailController.deleteSalaryGenerationDetail);

module.exports = router;