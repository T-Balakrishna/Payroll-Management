const express = require('express');
const router = express.Router();
const formulaController = require('../controllers/formulaController');

// Routes for formulas
// Frontend should call: /api/formulas
router.get('/', formulaController.getAllFormulas);
router.get('/:id', formulaController.getFormulaById);
router.post('/', formulaController.createFormula);
router.put('/:id', formulaController.updateFormula);
router.delete('/:id', formulaController.deleteFormula);

module.exports = router;