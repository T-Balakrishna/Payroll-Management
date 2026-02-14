import db from '../models/index.js';
const { SalaryGeneration } = db;
// Get all salary generations
// In real usage: filter by staffId, companyId, month/year, status, etc.
export const getAllSalaryGenerations = async (req, res) => {
  try {
    const salaryGenerations = await SalaryGeneration.findAll({
      include: [
        { model: db.Employee, as: 'employee' },
        { model: db.EmployeeSalaryMaster, as: 'employeeSalaryMaster' },
        { model: db.Company, as: 'company' },
        { model: db.User, as: 'generator' },
        { model: db.User, as: 'approver' },
        { model: db.User, as: 'payer' },
        // { model: db.SalaryGenerationDetail, as: 'salaryGenerationDetails' }  // heavy — include only when needed
      ]
    });
    res.json(salaryGenerations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single salary generation by ID
export const getSalaryGenerationById = async (req, res) => {
  try {
    const salaryGeneration = await SalaryGeneration.findByPk(req.params.id, {
      include: [
        { model: db.Employee, as: 'employee' },
        { model: db.EmployeeSalaryMaster, as: 'employeeSalaryMaster' },
        { model: db.Company, as: 'company' },
        { model: db.User, as: 'generator' },
        { model: db.User, as: 'approver' },
        { model: db.User, as: 'payer' },
      ]
    });

    if (!salaryGeneration) {
      return res.status(404).json({ message: 'Salary generation not found' });
    }

    res.json(salaryGeneration);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new salary generation record
// (usually created automatically during payroll run)
export const createSalaryGeneration = async (req, res) => {
  try {
    const salaryGeneration = await SalaryGeneration.create(req.body);
    res.status(201).json(salaryGeneration);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update salary generation
// (e.g. approve, mark as paid, update remarks/status)
export const updateSalaryGeneration = async (req, res) => {
  try {
    const [updated] = await SalaryGeneration.update(req.body, {
      where: { salaryGenerationId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Salary generation not found' });
    }

    const salaryGeneration = await SalaryGeneration.findByPk(req.params.id);
    res.json(salaryGeneration);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete salary generation (soft delete via paranoid: true)
// Usually rare — prefer changing status to 'Cancelled'
export const deleteSalaryGeneration = async (req, res) => {
  try {
    const deleted = await SalaryGeneration.destroy({
      where: { salaryGenerationId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Salary generation not found' });
    }

    res.json({ message: 'Salary generation deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};