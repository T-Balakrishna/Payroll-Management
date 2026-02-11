const { SalaryGeneration } = require('../models');

// Get all salary generations
// In real usage: filter by staffId, companyId, month/year, status, etc.
exports.getAllSalaryGenerations = async (req, res) => {
  try {
    const salaryGenerations = await SalaryGeneration.findAll({
      include: [
        { model: require('../models').Employee, as: 'employee' },
        { model: require('../models').EmployeeSalaryMaster, as: 'employeeSalaryMaster' },
        { model: require('../models').Company, as: 'company' },
        { model: require('../models').User, as: 'generator' },
        { model: require('../models').User, as: 'approver' },
        { model: require('../models').User, as: 'payer' },
        // { model: require('../models').SalaryGenerationDetail, as: 'salaryGenerationDetails' }  // heavy — include only when needed
      ]
    });
    res.json(salaryGenerations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single salary generation by ID
exports.getSalaryGenerationById = async (req, res) => {
  try {
    const salaryGeneration = await SalaryGeneration.findByPk(req.params.id, {
      include: [
        { model: require('../models').Employee, as: 'employee' },
        { model: require('../models').EmployeeSalaryMaster, as: 'employeeSalaryMaster' },
        { model: require('../models').Company, as: 'company' },
        { model: require('../models').User, as: 'generator' },
        { model: require('../models').User, as: 'approver' },
        { model: require('../models').User, as: 'payer' },
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
exports.createSalaryGeneration = async (req, res) => {
  try {
    const salaryGeneration = await SalaryGeneration.create(req.body);
    res.status(201).json(salaryGeneration);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update salary generation
// (e.g. approve, mark as paid, update remarks/status)
exports.updateSalaryGeneration = async (req, res) => {
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
exports.deleteSalaryGeneration = async (req, res) => {
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