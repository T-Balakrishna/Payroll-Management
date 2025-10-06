const express = require('express');
const router = express.Router();
const controller = require('../controllers/shiftAllocationController'); // Adjust path if needed

// GET /api/shiftAllocation/shifts
router.get('/shifts', controller.getShifts);

// GET /api/shiftAllocation/departments
router.get('/departments', controller.getDepartments);

// POST /api/shiftAllocation/employees/byDepartments
router.post('/employees/byDepartments', controller.getEmployeesByDepartments);

// POST /api/shiftAllocation/allocate
router.post('/allocate', controller.allocateShifts);

module.exports = router;