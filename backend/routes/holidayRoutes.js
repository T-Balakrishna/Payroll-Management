import express from 'express';
const router = express.Router();
import * as holidayController from '../controllers/holidayController.js';
// Routes for holidays
// Frontend should call: /api/holidays
router.get('/', holidayController.getAllHolidays);
router.get('/:id', holidayController.getHolidayById);
router.post('/', holidayController.createHoliday);
router.put('/:id', holidayController.updateHoliday);
router.delete('/:id', holidayController.deleteHoliday);

export default router;