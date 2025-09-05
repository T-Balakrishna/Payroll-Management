const Department = require('../models/Department'); // Sequelize model

// Create
exports.createDepartment = async (req, res) => {
  try {
    const { departmentName, departmentAckr, createdBy } = req.body;
    const newDepartment = await Department.create({
      departmentName,
      departmentAckr,
      createdBy
    });

    res.status(201).json(newDepartment);
  } catch (error) {
    console.error("❌ Error creating department:", error);
    res.status(500).send("Error creating department: " + error.message);
  }
};

// Read All (only active)
exports.getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll({ where: { status: 'active' } });
    res.json(departments);
  } catch (error) {
    res.status(500).send("Error fetching departments: " + error.message);
  }
};

// Read One by ID (only active)
exports.getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findOne({ 
      where: { departmentId: req.params.id, status: 'active' } 
    });
    if (!department) return res.status(404).send("Department not found or inactive");
    res.json(department);
  } catch (error) {
    res.status(500).send("Error fetching department: " + error.message);
  }
};

// Update
exports.updateDepartment = async (req, res) => {
  try {
    const department = await Department.findOne({ where: { departmentId: req.params.id, status: 'active' } });
    if (!department) return res.status(404).send("Department not found or inactive");

    await department.update({ ...req.body, updatedBy: req.body.updatedBy });
    res.json(department);
  } catch (error) {
    console.error("❌ Error updating department:", error);
    res.status(500).send("Error updating department: " + error.message);
  }
};

// Soft Delete (set status to inactive)
exports.deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findOne({ where: { departmentId: req.params.id, status: 'active' } });
    if (!department) return res.status(404).send("Department not found or already inactive");

    await department.update({ status: 'inactive', updatedBy: req.body.updatedBy });
    res.json({ message: "Department deactivated successfully" });
  } catch (error) {
    res.status(500).send("Error deleting department: " + error.message);
  }
};
