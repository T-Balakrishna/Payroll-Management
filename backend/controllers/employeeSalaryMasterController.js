import db from '../models/index.js';
const { EmployeeSalaryMaster } = db;
// Get all employee salary masters (filter by staffId/companyId in prod)
export const getAllEmployeeSalaryMasters = async (req, res) => {
  try {
    const salaryMasters = await EmployeeSalaryMaster.findAll({
      include: [
        { model: db.Employee, as: 'employee' },
        { model: db.Company, as: 'company' },
        { model: db.EmployeeSalaryMaster, as: 'previousSalary' },
        
        { model: db.User, as: 'approver' },
        // { model: db.EmployeeSalaryComponent, as: 'components' },  // heavy - include only when needed
        // { model: db.SalaryGeneration, as: 'salaryGenerations' }
      ]
    });
    res.json(salaryMasters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single salary master by ID
export const getEmployeeSalaryMasterById = async (req, res) => {
  try {
    const salaryMaster = await EmployeeSalaryMaster.findByPk(req.params.id, {
      include: [
        { model: db.Employee, as: 'employee' },
        { model: db.Company, as: 'company' },
        { model: db.EmployeeSalaryMaster, as: 'previousSalary' },
        
        { model: db.User, as: 'approver' },
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
export const createEmployeeSalaryMaster = async (req, res) => {
  try {
    const salaryMaster = await EmployeeSalaryMaster.create(req.body);
    res.status(201).json(salaryMaster);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update salary master (e.g. approve, change status, update amounts)
export const updateEmployeeSalaryMaster = async (req, res) => {
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
export const deleteEmployeeSalaryMaster = async (req, res) => {
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