import express from 'express';
const router = express.Router();
import * as holidayPlanController from '../controllers/holidayPlanController.js';
// Routes for holiday plans
// Frontend should call: /api/holidayPlans
router.get('/', holidayPlanController.getAllHolidayPlans);
router.get('/:id', holidayPlanController.getHolidayPlanById);
router.post('/', holidayPlanController.createHolidayPlan);
router.put('/:id', holidayPlanController.updateHolidayPlan);
router.delete('/:id', holidayPlanController.deleteHolidayPlan);

export default router;