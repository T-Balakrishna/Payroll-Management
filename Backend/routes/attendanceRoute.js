const express = require('express');
const router = express.Router();

const {
    createAttendance,
    getAllAttendances,
    getAttendanceById,
    updateAttendance,
    deleteAttendance
} = require('../controllers/attendanceController');

// CRUD Routes
router.post('/', createAttendance);        // Create
router.get('/', getAllAttendances);        // Read All
router.get('/:id', getAttendanceById);    // Read One
router.put('/:id', updateAttendance);     // Update
router.delete('/:id', deleteAttendance);  // Delete

module.exports = router;
