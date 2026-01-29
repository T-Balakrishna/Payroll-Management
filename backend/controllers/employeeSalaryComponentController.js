const { EmployeeSalaryComponent } = require('../models');

// Get all employee salary components
// In real usage → almost always filtered by employeeSalaryMasterId
exports.getAllEmployeeSalaryComponents = async (req, res) => {
  try {
    const components = await EmployeeSalaryComponent.findAll({
      include: [
        // Optional – include only when really needed
        // { model: require('../models').EmployeeSalaryMaster, as: 'salaryMaster' },
        // { model: require('../models').SalaryComponent, as: 'component' },
        // { model: require('../models').Formula, as: 'formula' }
      ]
    });
    res.json(components);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single employee salary component by ID
exports.getEmployeeSalaryComponentById = async (req, res) => {
  try {
    const component = await EmployeeSalaryComponent.findByPk(req.params.id, {
      include: [
        // { model: require('../models').EmployeeSalaryMaster, as: 'salaryMaster' },
        // { model: require('../models').SalaryComponent, as: 'component' },
        // { model: require('../models').Formula, as: 'formula' }
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
exports.createEmployeeSalaryComponent = async (req, res) => {
  try {
    const component = await EmployeeSalaryComponent.create(req.body);
    res.status(201).json(component);
  } catch (error) {
    res.status(400).json({ error: error.message }); // 400 better for validation errors
  }
};

// Update salary component (e.g. change amount, order, remarks, recalculate)
exports.updateEmployeeSalaryComponent = async (req, res) => {
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
exports.deleteEmployeeSalaryComponent = async (req, res) => {
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