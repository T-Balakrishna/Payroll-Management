import express from 'express';
const router = express.Router();
import * as attendanceController from '../controllers/attendanceController.js';
// Routes for attendance
// Frontend should call: /api/attendances
router.get('/', attendanceController.getAllAttendances);
router.post('/process-punches', attendanceController.processPunchesToAttendance);
router.post('/test/seed-process-verify', attendanceController.seedProcessVerifyAttendanceTest);
router.get("/month", attendanceController.fetchMonthAttendance);
router.get('/:id', attendanceController.getAttendanceById);
router.post('/', attendanceController.createAttendance);
router.put('/:id', attendanceController.updateAttendance);
router.delete('/:id', attendanceController.deleteAttendance);

export default router;
