import express from 'express';
const router = express.Router();
import * as shiftAssignmentController from '../controllers/shiftAssignmentController.js';
// Routes for shift assignments
// Frontend should call: /api/shiftAssignments
router.get('/', shiftAssignmentController.getAllShiftAssignments);
router.get('/:id', shiftAssignmentController.getShiftAssignmentById);
router.post('/', shiftAssignmentController.createShiftAssignment);
router.put('/:id', shiftAssignmentController.updateShiftAssignment);
router.delete('/:id', shiftAssignmentController.deleteShiftAssignment);

export default router;