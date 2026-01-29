const express = require('express');
const router = express.Router();
const salaryRevisionHistoryController = require('../controllers/salaryRevisionHistoryController');

// Routes for salary revision histories
// Frontend should call: /api/salaryRevisionHistories
router.get('/', salaryRevisionHistoryController.getAllSalaryRevisionHistories);
router.get('/:id', salaryRevisionHistoryController.getSalaryRevisionHistoryById);
router.post('/', salaryRevisionHistoryController.createSalaryRevisionHistory);
router.put('/:id', salaryRevisionHistoryController.updateSalaryRevisionHistory);
router.delete('/:id', salaryRevisionHistoryController.deleteSalaryRevisionHistory);

module.exports = router;