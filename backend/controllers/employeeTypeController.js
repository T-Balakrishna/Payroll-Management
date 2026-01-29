const { EmployeeType } = require('../models');

// Get all employee types (in practice: filter by companyId)
exports.getAllEmployeeTypes = async (req, res) => {
  try {
    const employeeTypes = await EmployeeType.findAll({
      include: [
        { model: require('../models').Company, as: 'company' },
        { model: require('../models').User, as: 'creator' },
        { model: require('../models').User, as: 'updater' },
        // { model: require('../models').Employee, as: 'employees' }          // heavy - include only when needed
        // { model: require('../models').LeavePolicy, as: 'leavePolicies' }
      ]
    });
    res.json(employeeTypes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single employee type by ID
exports.getEmployeeTypeById = async (req, res) => {
  try {
    const employeeType = await EmployeeType.findByPk(req.params.id, {
      include: [
        { model: require('../models').Company, as: 'company' },
        { model: require('../models').User, as: 'creator' },
        { model: require('../models').User, as: 'updater' },
      ]
    });

    if (!employeeType) {
      return res.status(404).json({ message: 'Employee type not found' });
    }

    res.json(employeeType);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new employee type
exports.createEmployeeType = async (req, res) => {
  try {
    const employeeType = await EmployeeType.create(req.body);
    res.status(201).json(employeeType);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update employee type
exports.updateEmployeeType = async (req, res) => {
  try {
    const [updated] = await EmployeeType.update(req.body, {
      where: { employeeTypeId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Employee type not found' });
    }

    const employeeType = await EmployeeType.findByPk(req.params.id);
    res.json(employeeType);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete employee type (soft delete via paranoid: true)
exports.deleteEmployeeType = async (req, res) => {
  try {
    const deleted = await EmployeeType.destroy({
      where: { employeeTypeId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Employee type not found' });
    }

    res.json({ message: 'Employee type deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};