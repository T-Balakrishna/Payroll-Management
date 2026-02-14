import express from 'express';
const router = express.Router();
import * as formulaController from '../controllers/formulaController.js';
// Routes for formulas
// Frontend should call: /api/formulas
router.get('/', formulaController.getAllFormulas);
router.get('/:id', formulaController.getFormulaById);
router.post('/', formulaController.createFormula);
router.put('/:id', formulaController.updateFormula);
router.delete('/:id', formulaController.deleteFormula);

export default router;