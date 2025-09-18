const express = require("express");
const router = express.Router();
const shiftController = require("../controllers/shiftAllocationController");

// GET all data needed for shift allocation (departments, employees, shifts)
router.get("/data", shiftController.getShiftAllocationData);

// POST allocate shifts (updates employee table)
router.post("/allocate", shiftController.allocateShifts);

module.exports = router;
