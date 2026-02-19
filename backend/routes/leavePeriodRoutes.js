import express from 'express';
import * as leavePeriodController from '../controllers/leavePeriodController.js';

const router = express.Router();

router.get('/', leavePeriodController.getAllLeavePeriods);
router.get('/active', leavePeriodController.getActiveLeavePeriod);
router.get('/:id', leavePeriodController.getLeavePeriodById);
router.post('/', leavePeriodController.createLeavePeriod);
router.put('/:id', leavePeriodController.updateLeavePeriod);
router.delete('/:id', leavePeriodController.deleteLeavePeriod);

export default router;
