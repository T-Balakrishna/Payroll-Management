const express = require('express');
const router = express.Router();
const {
  createHolidayPlan,
  getAllHolidayPlans,
  getHolidayPlanById,
  updateHolidayPlan,
  deleteHolidayPlan
} = require('../controllers/holidayPlanController');

router.post('/', createHolidayPlan);
router.get('/', getAllHolidayPlans);
router.get('/:id', getHolidayPlanById);
router.put('/:id', updateHolidayPlan);
router.delete('/:id', deleteHolidayPlan);

module.exports = router;
