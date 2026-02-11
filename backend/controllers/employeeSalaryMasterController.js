const { EmployeeSalaryMaster } = require('../models');

// Get all employee salary masters (filter by staffId/companyId in prod)
exports.getAllEmployeeSalaryMasters = async (req, res) => {
  try {
    const salaryMasters = await EmployeeSalaryMaster.findAll({
      include: [
        { model: require('../models').Employee, as: 'employee' },
        { model: require('../models').Company, as: 'company' },
        { model: require('../models').EmployeeSalaryMaster, as: 'previousSalary' },
        
        { model: require('../models').User, as: 'approver' },
        // { model: require('../models').EmployeeSalaryComponent, as: 'components' },  // heavy - include only when needed
        // { model: require('../models').SalaryGeneration, as: 'salaryGenerations' }
      ]
    });
    res.json(salaryMasters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single salary master by ID
exports.getEmployeeSalaryMasterById = async (req, res) => {
  try {
    const salaryMaster = await EmployeeSalaryMaster.findByPk(req.params.id, {
      include: [
        { model: require('../models').Employee, as: 'employee' },
        { model: require('../models').Company, as: 'company' },
        { model: require('../models').EmployeeSalaryMaster, as: 'previousSalary' },
        
        { model: require('../models').User, as: 'approver' },
      ]
    });

    if (!salaryMaster) {
      return res.status(404).json({ message: 'Employee salary master not found' });
    }

    res.json(salaryMaster);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new salary master (initial or revision)
exports.createEmployeeSalaryMaster = async (req, res) => {
  try {
    const salaryMaster = await EmployeeSalaryMaster.create(req.body);
    res.status(201).json(salaryMaster);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update salary master (e.g. approve, change status, update amounts)
exports.updateEmployeeSalaryMaster = async (req, res) => {
  try {
    const [updated] = await EmployeeSalaryMaster.update(req.body, {
      where: { employeeSalaryMasterId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Employee salary master not found' });
    }

    const salaryMaster = await EmployeeSalaryMaster.findByPk(req.params.id);
    res.json(salaryMaster);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete salary master (soft delete via paranoid: true)
exports.deleteEmployeeSalaryMaster = async (req, res) => {
  try {
    const deleted = await EmployeeSalaryMaster.destroy({
      where: { employeeSalaryMasterId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Employee salary master not found' });
    }

    res.json({ message: 'Employee salary master deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};