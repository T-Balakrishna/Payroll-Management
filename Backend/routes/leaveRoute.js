const express = require("express");
const router = express.Router();
const leaveController = require("../controllers/leaveController");

// Employee: Apply leave
router.post("/", leaveController.applyLeave);

// Admin/Employee: Get all leaves (optional status filter via query)
router.get("/", leaveController.getAllLeaves);

// Admin: Get leaves by specific status (pending, approved, rejected)
router.get("/status/:status", leaveController.getLeavesByStatus);

// Admin: Update leave status (approve/reject)
router.put("/:leaveId/status", leaveController.updateLeaveStatus);

module.exports = router;
