const EmployeeGrade = require('../models/EmployeeGrade'); // Sequelize model

// Create
exports.createEmployeeGrade = async (req, res) => {
  try {
    const { employeeGradeName, employeeGradeAckr, createdBy } = req.body;
    const newEmployeeGrade = await EmployeeGrade.create({
      employeeGradeName,
      employeeGradeAckr,
      createdBy
    });

    res.status(201).json(newEmployeeGrade);
  } catch (error) {
    console.error("❌ Error creating employee grade:", error);
    res.status(500).send("Error creating employee grade: " + error.message);
  }
};

// Read All (only active)
exports.getAllEmployeeGrades = async (req, res) => {
  try {
    const grades = await EmployeeGrade.findAll({ where: { status: 'active' } });
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
    const grade = await EmployeeGrade.findOne({ where: { employeeGradeId: req.params.id, status: 'active' } });
    if (!grade) return res.status(404).send("Employee grade not found or inactive");

    await grade.update({ ...req.body, updatedBy: req.body.updatedBy });
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
