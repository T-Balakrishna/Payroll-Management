const express = require('express');
const router = express.Router();

const {
    createAttendance,
    getAllAttendances,
    getAttendanceById,
    updateAttendance,
    deleteAttendance,
    getAttendanceCount,
    getPresentAbsentSummary,
    getmonthlyAttendanceSummary
} = require('../controllers/attendanceController');

// CRUD Routes
router.post('/', createAttendance);        // Create
router.get('/', getAllAttendances);        // Read All
router.get('/:id', getAttendanceById);    // Read One
router.put('/:id', updateAttendance);     // Update
router.delete('/:id', deleteAttendance);  // Delete
router.get('/count/:companyId',getAttendanceCount); // Get count of active attendances by company
router.get('/presentabsentsummary/:companyId', getPresentAbsentSummary); // Get present absent summary
router.get('/monthlyattendancesummary/:companyId', getmonthlyAttendanceSummary); // Get monthly attendance summary

module.exports = router;
