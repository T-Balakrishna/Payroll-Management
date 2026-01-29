const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');

// Routes for attendance
// Frontend should call: /api/attendances
router.get('/', attendanceController.getAllAttendances);
router.get('/:id', attendanceController.getAttendanceById);
router.post('/', attendanceController.createAttendance);
router.put('/:id', attendanceController.updateAttendance);
router.delete('/:id', attendanceController.deleteAttendance);

module.exports = router;