const EmployeeGrade = require('../models/EmployeeGrade'); // Sequelize model

// Create
exports.createEmployeeGrade = async (req, res) => {
  try {
    const { employeeGradeName, employeeGradeAckr, companyId, createdBy } = req.body;
    if (!employeeGradeName || !employeeGradeAckr || !companyId || !createdBy) {
      return res.status(400).send("Missing required fields: employeeGradeName, employeeGradeAckr, companyId, or createdBy");
    }

    const newEmployeeGrade = await EmployeeGrade.create({
      employeeGradeName,
      employeeGradeAckr,
      companyId,
      createdBy,
      status: 'active', // Default status
    });

    res.status(201).json(newEmployeeGrade);
  } catch (error) {
    console.error("❌ Error creating employee grade:", error);
    res.status(500).send("Error creating employee grade: " + error.message);
  }
};

// Read All (only active, with optional companyId filter)
exports.getAllEmployeeGrades = async (req, res) => {
  try {
    const { companyId } = req.query;
    const whereClause = { status: 'active' };
    if (companyId) whereClause.companyId = companyId;

    const grades = await EmployeeGrade.findAll({ where: whereClause });
    res.json(grades);
  } catch (error) {
    res.status(500).send("Error fetching employee grades: " + error.message);
  }
};

// Read One by ID (only active)
exports.getEmployeeGradeById = async (req, res) => {
  try {
    const grade = await EmployeeGrade.findOne({ 
      where: { employeeGradeId: req.params.id, status: 'active' } 
    });
    if (!grade) return res.status(404).send("Employee grade not found or inactive");
    res.json(grade);
  } catch (error) {
    res.status(500).send("Error fetching employee grade: " + error.message);
  }
};

// Update
exports.updateEmployeeGrade = async (req, res) => {
  try {
    const { employeeGradeName, employeeGradeAckr, companyId, updatedBy } = req.body;
    const grade = await EmployeeGrade.findOne({ where: { employeeGradeId: req.params.id, status: 'active' } });
    if (!grade) return res.status(404).send("Employee grade not found or inactive");

    await grade.update({
      employeeGradeName,
      employeeGradeAckr,
      companyId,
      updatedBy,
      updatedAt: new Date(), // Optional: Update timestamp
    });
    res.json(grade);
  } catch (error) {
    console.error("❌ Error updating employee grade:", error);
    res.status(500).send("Error updating employee grade: " + error.message);
  }
};

// Soft Delete (set status to inactive)
exports.deleteEmployeeGrade = async (req, res) => {
  try {
    const grade = await EmployeeGrade.findOne({ where: { employeeGradeId: req.params.id, status: 'active' } });
    if (!grade) return res.status(404).send("Employee grade not found or already inactive");

    await grade.update({ status: 'inactive', updatedBy: req.body.updatedBy });
    res.json({ message: "Employee grade deactivated successfully" });
  } catch (error) {
    res.status(500).send("Error deleting employee grade: " + error.message);
  }
};