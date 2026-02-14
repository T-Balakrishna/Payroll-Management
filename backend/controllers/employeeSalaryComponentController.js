import db from '../models/index.js';
const { EmployeeSalaryComponent } = db;
// Get all employee salary components
// In real usage → almost always filtered by employeeSalaryMasterId
export const getAllEmployeeSalaryComponents = async (req, res) => {
  try {
    const components = await EmployeeSalaryComponent.findAll({
      include: [
        // Optional – include only when really needed
        // { model: db.EmployeeSalaryMaster, as: 'salaryMaster' },
        // { model: db.SalaryComponent, as: 'component' },
        // { model: db.Formula, as: 'formula' }
      ]
    });
    res.json(components);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single employee salary component by ID
export const getEmployeeSalaryComponentById = async (req, res) => {
  try {
    const component = await EmployeeSalaryComponent.findByPk(req.params.id, {
      include: [
        // { model: db.EmployeeSalaryMaster, as: 'salaryMaster' },
        // { model: db.SalaryComponent, as: 'component' },
        // { model: db.Formula, as: 'formula' }
      ]
    });

    if (!component) {
      return res.status(404).json({ message: 'Employee salary component not found' });
    }

    res.json(component);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new salary component entry for an employee salary structure
export const createEmployeeSalaryComponent = async (req, res) => {
  try {
    const component = await EmployeeSalaryComponent.create(req.body);
    res.status(201).json(component);
  } catch (error) {
    res.status(400).json({ error: error.message }); // 400 better for validation errors
  }
};

// Update salary component (e.g. change amount, order, remarks, recalculate)
export const updateEmployeeSalaryComponent = async (req, res) => {
  try {
    const [updated] = await EmployeeSalaryComponent.update(req.body, {
      where: { employeeSalaryComponentId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Employee salary component not found' });
    }

    const component = await EmployeeSalaryComponent.findByPk(req.params.id);
    res.json(component);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete salary component entry
// (usually only allowed before salary is processed / generated)
export const deleteEmployeeSalaryComponent = async (req, res) => {
  try {
    const deleted = await EmployeeSalaryComponent.destroy({
      where: { employeeSalaryComponentId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Employee salary component not found' });
    }

    res.json({ message: 'Employee salary component deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};