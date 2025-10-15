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

router.get("/employee/:employeeNumber", leaveController.getLeavesByEmployee);

router.get("/stats/:companyId", leaveController.getLeaveStatsByCompany);

router.get("/takensummary/:companyId", leaveController.getLeaveTakenSummary);

module.exports = router;
