const express = require('express');
const router = express.Router();

const {
    createHoliday,
    getAllHolidays,
    getHolidayById,
    updateHoliday,
    deleteHoliday
} = require('../controllers/holidayController');

router.post('/', createHoliday);
router.get('/', getAllHolidays);
router.get('/:id', getHolidayById);
router.put('/:id', updateHoliday);
router.delete('/:id', deleteHoliday);

module.exports = router;
