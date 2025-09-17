const ShiftAllocation = require("../models/ShiftAllocation");
const Employee = require("../models/Employee");
const Department = require("../models/Department");
const Shift = require("../models/Shift");

// ✅ Create shift allocation (single/multiple employees)
exports.createShiftAllocation = async (req, res) => {
  try {
    const { departmentId, employeeNumbers, shiftId, status, createdBy } = req.body;

    let employeesToAllocate = [];

    if (departmentId) {
      employeesToAllocate = await Employee.findAll({
        where: { departmentId },
        attributes: ["employeeNumber"],
      });
    }

    if (employeeNumbers && employeeNumbers.length > 0) {
      employeesToAllocate = [
        ...employeesToAllocate,
        ...employeeNumbers.map((num) => ({ employeeNumber: num })),
      ];
    }

    if (employeesToAllocate.length === 0) {
      return res.status(400).json({ error: "No employees found to allocate shift" });
    }

    const allocations = await Promise.all(
      employeesToAllocate.map((emp) =>
        ShiftAllocation.create({
          employeeNumber: emp.employeeNumber,
          departmentId: departmentId || null,
          shiftId,
          status: status || "active",
          createdBy,
        })
      )
    );

    res.status(201).json(allocations);
  } catch (error) {
    console.error("Error creating shift allocation:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
// ✅ Get all allocations
exports.getAllShiftAllocations = async (req, res) => {
  try {
    const allocations = await ShiftAllocation.findAll({
      include: [
        {
          model: Employee, // ShiftAllocation → Employee
          include: [
            { model: Department, as: 'department' }, // Employee → Department
            { model: Shift, as: 'shift' },           // Employee → Shift
          ],
        },
        { model: Department }, // ShiftAllocation → Department
        { model: Shift },      // ShiftAllocation → Shift
      ],
    });
    res.json(allocations);
  } catch (error) {
    console.error("Error fetching shift allocations:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};

// ✅ Get allocation by ID
exports.getShiftAllocationById = async (req, res) => {
  try {
    const allocation = await ShiftAllocation.findByPk(req.params.id, {
      include: [
        {
          model: Employee, // ShiftAllocation → Employee
          include: [
            { model: Department, as: 'department' }, // Employee → Department
            { model: Shift, as: 'shift' },           // Employee → Shift
          ],
        },
        { model: Department }, // ShiftAllocation → Department
        { model: Shift },      // ShiftAllocation → Shift
      ],
    });

    if (!allocation) {
      return res.status(404).json({ error: "Shift allocation not found" });
    }

    res.json(allocation);
  } catch (error) {
    console.error("Error fetching shift allocation:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


// ✅ Update allocation
exports.updateShiftAllocation = async (req, res) => {
  try {
    const { shiftId, status, updatedBy } = req.body;
    const [updated] = await ShiftAllocation.update(
      { shiftId, status, updatedBy },
      { where: { allocationId: req.params.id } }
    );
    if (!updated) return res.status(404).json({ error: "Shift allocation not found" });
    const updatedAllocation = await ShiftAllocation.findByPk(req.params.id);
    res.json(updatedAllocation);
  } catch (error) {
    console.error("Error updating shift allocation:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Delete allocation
exports.deleteShiftAllocation = async (req, res) => {
  try {
    const deleted = await ShiftAllocation.destroy({ where: { allocationId: req.params.id } });
    if (!deleted) return res.status(404).json({ error: "Shift allocation not found" });
    res.json({ message: "Shift allocation deleted successfully" });
  } catch (error) {
    console.error("Error deleting shift allocation:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Allocate shift to all employees in a department
exports.allocateShiftToDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { shiftId, status, createdBy } = req.body;

    const employees = await Employee.findAll({
      where: { departmentId },
      attributes: ["employeeNumber"],
    });

    if (!employees.length) return res.status(404).json({ error: "No employees found in department" });

    const allocations = await Promise.all(
      employees.map((emp) =>
        ShiftAllocation.create({
          employeeNumber: emp.employeeNumber,
          departmentId,
          shiftId,
          status: status || "active",
          createdBy,
        })
      )
    );

    res.status(201).json(allocations);
  } catch (error) {
    console.error("Error allocating shift to department:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Allocate shift to all employees across all departments
exports.allocateShiftToAllDepartments = async (req, res) => {
  try {
    const { shiftId, status, createdBy } = req.body;

    const employees = await Employee.findAll({ attributes: ["employeeNumber", "departmentId"] });
    if (!employees.length) return res.status(404).json({ error: "No employees found" });

    const allocations = await Promise.all(
      employees.map((emp) =>
        ShiftAllocation.create({
          employeeNumber: emp.employeeNumber,
          departmentId: emp.departmentId,
          shiftId,
          status: status || "active",
          createdBy,
        })
      )
    );

    res.status(201).json(allocations);
  } catch (error) {
    console.error("Error allocating shift to all employees:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};