import express from 'express';
const router = express.Router();
import * as salaryRevisionHistoryController from '../controllers/salaryRevisionHistoryController.js';
// Routes for salary revision histories
// Frontend should call: /api/salaryRevisionHistories
router.get('/', salaryRevisionHistoryController.getAllSalaryRevisionHistories);
router.get('/:id', salaryRevisionHistoryController.getSalaryRevisionHistoryById);
router.post('/', salaryRevisionHistoryController.createSalaryRevisionHistory);
router.put('/:id', salaryRevisionHistoryController.updateSalaryRevisionHistory);
router.delete('/:id', salaryRevisionHistoryController.deleteSalaryRevisionHistory);

export default router;