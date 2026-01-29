const express = require('express');
const router = express.Router();
const salaryComponentController = require('../controllers/salaryComponentController');

// Routes for salary components
// Frontend should call: /api/salaryComponents
router.get('/', salaryComponentController.getAllSalaryComponents);
router.get('/:id', salaryComponentController.getSalaryComponentById);
router.post('/', salaryComponentController.createSalaryComponent);
router.put('/:id', salaryComponentController.updateSalaryComponent);
router.delete('/:id', salaryComponentController.deleteSalaryComponent);

module.exports = router;