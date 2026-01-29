const { Department } = require('../models');

// Get all departments (in real usage: filter by companyId almost always)
exports.getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll({
      include: [
        { model: require('../models').Company, as: 'company' },
        { model: require('../models').User, as: 'creator' },
        { model: require('../models').User, as: 'updater' },
        // { model: require('../models').Employee, as: 'employees' }   // ← only include if needed (can be heavy)
      ]
    });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single department by ID
exports.getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id, {
      include: [
        { model: require('../models').Company, as: 'company' },
        { model: require('../models').User, as: 'creator' },
        { model: require('../models').User, as: 'updater' },
        // { model: require('../models').Employee, as: 'employees' }
      ]
    });

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    res.json(department);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new department
exports.createDepartment = async (req, res) => {
  try {
    const department = await Department.create(req.body);
    res.status(201).json(department);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update department
exports.updateDepartment = async (req, res) => {
  try {
    const [updated] = await Department.update(req.body, {
      where: { departmentId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const department = await Department.findByPk(req.params.id);
    res.json(department);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete department (soft delete supported via paranoid: true)
exports.deleteDepartment = async (req, res) => {
  try {
    const deleted = await Department.destroy({
      where: { departmentId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Department not found' });
    }

    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};