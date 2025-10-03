const EmployeeType = require('../models/EmployeeType'); // Sequelize model

// Create
exports.createEmployeeType = async (req, res) => {
  try {
    const { employeeTypeName, employeeTypeAckr, companyId, createdBy } = req.body;
    if (!employeeTypeName || !employeeTypeAckr || !companyId || !createdBy) {
      return res.status(400).send("Missing required fields: employeeTypeName, employeeTypeAckr, companyId, or createdBy");
    }

    const newEmployeeType = await EmployeeType.create({
      employeeTypeName,
      employeeTypeAckr,
      companyId,
      createdBy,
      status: 'active', // Default status
    });

    res.status(201).json(newEmployeeType);
  } catch (error) {
    console.error("❌ Error creating employee type:", error);
    res.status(500).send("Error creating employee type: " + error.message);
  }
};

// Read All (only active, with optional companyId filter)
exports.getAllEmployeeTypes = async (req, res) => {
  try {
    const { companyId } = req.query;
    const whereClause = { status: 'active' };
    if (companyId) whereClause.companyId = companyId;

    const types = await EmployeeType.findAll({ where: whereClause });
    res.json(types);
  } catch (error) {
    res.status(500).send("Error fetching employee types: " + error.message);
  }
};

// Read One by ID (only active)
exports.getEmployeeTypeById = async (req, res) => {
  try {
    const type = await EmployeeType.findOne({ 
      where: { employeeTypeId: req.params.id, status: 'active' } 
    });
    if (!type) return res.status(404).send("Employee type not found or inactive");
    res.json(type);
  } catch (error) {
    res.status(500).send("Error fetching employee type: " + error.message);
  }
};

// Update
exports.updateEmployeeType = async (req, res) => {
  try {
    const { employeeTypeName, employeeTypeAckr, companyId, updatedBy } = req.body;
    const type = await EmployeeType.findOne({ where: { employeeTypeId: req.params.id, status: 'active' } });
    if (!type) return res.status(404).send("Employee type not found or inactive");

    await type.update({
      employeeTypeName,
      employeeTypeAckr,
      companyId,
      updatedBy,
      updatedAt: new Date(), // Optional: Update timestamp
    });
    res.json(type);
  } catch (error) {
    console.error("❌ Error updating employee type:", error);
    res.status(500).send("Error updating employee type: " + error.message);
  }
};

// Soft Delete (set status to inactive)
exports.deleteEmployeeType = async (req, res) => {
  try {
    const type = await EmployeeType.findOne({ where: { employeeTypeId: req.params.id, status: 'active' } });
    if (!type) return res.status(404).send("Employee type not found or already inactive");

    await type.update({ status: 'inactive', updatedBy: req.body.updatedBy });
    res.json({ message: "Employee type deactivated successfully" });
  } catch (error) {
    res.status(500).send("Error deleting employee type: " + error.message);
  }
};