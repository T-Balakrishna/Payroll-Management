import db from '../models/index.js';
const { Employee } = db;
// Get all employees
export const getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.findAll({
      include: [
        { model: db.Department, as: 'department' },
        { model: db.Designation, as: 'designation' },
      ]
    });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get employee by ID
export const getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id, {
      include: [
        { model: db.Department, as: 'department' },
        { model: db.Designation, as: 'designation' },
      ]
    });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new employee
export const createEmployee = async (req, res) => {
  try {
    const employee = await Employee.create(req.body);
    res.status(201).json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update employee
export const updateEmployee = async (req, res) => {
  try {
    const [updated] = await Employee.update(req.body, { where: { staffId: req.params.id } });
    if (!updated) return res.status(404).json({ message: 'Employee not found' });
    const employee = await Employee.findByPk(req.params.id);
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete employee
export const deleteEmployee = async (req, res) => {
  try {
    const deleted = await Employee.destroy({ where: { staffId: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Employee not found' });
    res.json({ message: 'Employee deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
