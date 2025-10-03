const Department = require('../models/Department'); // Sequelize model
const Company = require("../models/Company")

// Create
exports.createDepartment = async (req, res) => {
  try {
    const { departmentName, departmentAckr, createdBy,companyId } = req.body;
    const newDepartment = await Department.create({
      departmentName,
      departmentAckr,
      createdBy,
      companyId,
    });

    res.status(201).json(newDepartment);
  } catch (error) {
    console.error("❌ Error creating department:", error);
    res.status(500).send("Error creating department: " + error.message);
  }
};

// Read All (only active)
// Read All (active, with optional companyId filter)
exports.getAllDepartments = async (req, res) => {
  try {
    const { companyId } = req.query;
    const whereClause = { status: 'active' };

    // Add companyId filter if provided
    if (companyId) {
      whereClause.companyId = companyId;

      // Optional: Validate if company exists
      const companyExists = await Company.findOne({ where: { companyId } });
      if (!companyExists) {
        return res.status(404).json({ message: 'Company not found' });
      }
    }

    const departments = await Department.findAll({
      where: whereClause,
      // attributes: ['departmentId', 'departmentAckr', 'companyId'], // Match frontend expectations
    });

    res.status(200).json(departments);
  } catch (error) {
    console.error('❌ Error fetching departments:', error);
    res.status(500).json({ message: 'Error fetching departments: ' + error.message });
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
