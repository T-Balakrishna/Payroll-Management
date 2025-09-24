const express = require("express");
const router = express.Router();
const {
  createLeaveAllocation,
  getAllLeaveAllocations,
  getLeaveAllocationById,
  updateLeaveAllocation,
  deleteLeaveAllocation,
} = require("../controllers/leaveAllocationController");

// CRUD
router.post("/", createLeaveAllocation);
router.get("/", getAllLeaveAllocations);
router.get("/:id", getLeaveAllocationById);
router.put("/", updateLeaveAllocation);
router.delete("/:id", deleteLeaveAllocation);

module.exports = router;
