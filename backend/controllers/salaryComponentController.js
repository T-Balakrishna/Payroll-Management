import db from '../models/index.js';
const { SalaryComponent } = db;
// Get all salary components
// In real usage: almost always filtered by companyId
export const getAllSalaryComponents = async (req, res) => {
  try {
    const salaryComponents = await SalaryComponent.findAll({
      include: [
        { model: db.Company, as: 'company' },
        
        // { model: db.Formula, as: 'formulas' },           // heavy — include only when needed
        // { model: db.EmployeeSalaryComponent, as: 'employeeSalaryComponents' }
      ]
    });
    res.json(salaryComponents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single salary component by ID
export const getSalaryComponentById = async (req, res) => {
  try {
    const salaryComponent = await SalaryComponent.findByPk(req.params.id, {
      include: [
        { model: db.Company, as: 'company' },
        
      ]
    });

    if (!salaryComponent) {
      return res.status(404).json({ message: 'Salary component not found' });
    }

    res.json(salaryComponent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new salary component
export const createSalaryComponent = async (req, res) => {
  try {
    const salaryComponent = await SalaryComponent.create(req.body);
    res.status(201).json(salaryComponent);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update salary component
export const updateSalaryComponent = async (req, res) => {
  try {
    const [updated] = await SalaryComponent.update(req.body, {
      where: { salaryComponentId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Salary component not found' });
    }

    const salaryComponent = await SalaryComponent.findByPk(req.params.id);
    res.json(salaryComponent);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete salary component (soft delete via paranoid: true)
export const deleteSalaryComponent = async (req, res) => {
  try {
    const deleted = await SalaryComponent.destroy({
      where: { salaryComponentId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Salary component not found' });
    }

    res.json({ message: 'Salary component deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};