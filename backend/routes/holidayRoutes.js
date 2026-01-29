const express = require('express');
const router = express.Router();
const holidayController = require('../controllers/holidayController');

// Routes for holidays
// Frontend should call: /api/holidays
router.get('/', holidayController.getAllHolidays);
router.get('/:id', holidayController.getHolidayById);
router.post('/', holidayController.createHoliday);
router.put('/:id', holidayController.updateHoliday);
router.delete('/:id', holidayController.deleteHoliday);

module.exports = router;