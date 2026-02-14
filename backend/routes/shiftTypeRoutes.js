import express from 'express';
const router = express.Router();
import * as shiftTypeController from '../controllers/shiftTypeController.js';
// Routes for shift types
// Frontend should call: /api/shiftTypes
router.get('/', shiftTypeController.getAllShiftTypes);
router.get('/:id', shiftTypeController.getShiftTypeById);
router.post('/', shiftTypeController.createShiftType);
router.put('/:id', shiftTypeController.updateShiftType);
router.delete('/:id', shiftTypeController.deleteShiftType);

export default router;