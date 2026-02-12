const { EmployeeGrade, Company } = require("../models");

// Get all employee grades
exports.getAllEmployeeGrades = async (req, res) => {
  try {
    const { companyId } = req.query;
    const where = {};
    if (companyId) where.companyId = companyId;

    const employeeGrades = await EmployeeGrade.findAll({
      where,
      include: [{ model: Company, as: "company" }],
      order: [["employeeGradeName", "ASC"]],
    });
    res.json(employeeGrades);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single employee grade by ID
exports.getEmployeeGradeById = async (req, res) => {
  try {
    const employeeGrade = await EmployeeGrade.findByPk(req.params.id, {
      include: [{ model: Company, as: "company" }],
    });

    if (!employeeGrade) {
      return res.status(404).json({ message: "Employee grade not found" });
    }

    res.json(employeeGrade);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new employee grade
exports.createEmployeeGrade = async (req, res) => {
  try {
    const employeeGrade = await EmployeeGrade.create(req.body);
    res.status(201).json(employeeGrade);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update employee grade
exports.updateEmployeeGrade = async (req, res) => {
  try {
    const [updated] = await EmployeeGrade.update(req.body, {
      where: { employeeGradeId: req.params.id },
    });

    if (!updated) {
      return res.status(404).json({ message: "Employee grade not found" });
    }

    const employeeGrade = await EmployeeGrade.findByPk(req.params.id);
    res.json(employeeGrade);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete employee grade (soft delete supported via paranoid: true)
exports.deleteEmployeeGrade = async (req, res) => {
  try {
    const deleted = await EmployeeGrade.destroy({
      where: { employeeGradeId: req.params.id },
    });

    if (!deleted) {
      return res.status(404).json({ message: "Employee grade not found" });
    }

    res.json({ message: "Employee grade deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
