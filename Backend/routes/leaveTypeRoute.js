const express = require("express");
const router = express.Router();
const leaveTypeController = require("../controllers/leaveTypeController");

// Create new leave type
router.post("/", leaveTypeController.createLeaveType);

// Get all active leave types
router.get("/", leaveTypeController.getAllLeaveTypes);

// Get a leave type by ID (only active)
router.get("/:id", leaveTypeController.getLeaveTypeById);

// Update leave type
router.put("/:id", leaveTypeController.updateLeaveType);

// Soft delete (set status = inactive)
router.delete("/:id", leaveTypeController.deleteLeaveType);

module.exports = router;
