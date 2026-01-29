const express = require('express');
const router = express.Router();
const holidayPlanController = require('../controllers/holidayPlanController');

// Routes for holiday plans
// Frontend should call: /api/holidayPlans
router.get('/', holidayPlanController.getAllHolidayPlans);
router.get('/:id', holidayPlanController.getHolidayPlanById);
router.post('/', holidayPlanController.createHolidayPlan);
router.put('/:id', holidayPlanController.updateHolidayPlan);
router.delete('/:id', holidayPlanController.deleteHolidayPlan);

module.exports = router;