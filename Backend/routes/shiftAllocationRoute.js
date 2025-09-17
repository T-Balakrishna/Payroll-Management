const express = require("express");
const router = express.Router();
const {
  createShiftAllocation,
  getAllShiftAllocations,
  getShiftAllocationById,
  updateShiftAllocation,
  deleteShiftAllocation,
  allocateShiftToDepartment,
  allocateShiftToAllDepartments,
} = require("../controllers/shiftAllocationController");

// Create a new shift allocation (single employee or multiple)
router.post("/", createShiftAllocation);

// Get all shift allocations
router.get("/", getAllShiftAllocations);

// Get a specific allocation by ID
router.get("/:id", getShiftAllocationById);

// Update an allocation by ID
router.put("/:id", updateShiftAllocation);

// Delete an allocation by ID
router.delete("/:id", deleteShiftAllocation);

// Allocate shift to all employees in a specific department
router.post("/allocate/department/:departmentId", allocateShiftToDepartment);

// Allocate shift to all employees across all departments
router.post("/allocate/all", allocateShiftToAllDepartments);

module.exports = router;