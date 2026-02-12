const { Department } = require('../models');

const normalizeStatus = (status) => {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'inactive') return 'Inactive';
  if (value === 'archived') return 'Archived';
  return 'Active';
};

const formatSequelizeError = (error) => {
  if (!error) return 'Operation failed';
  if (error.name === 'SequelizeUniqueConstraintError') {
    return 'Department already exists in this company';
  }
  if (error.name === 'SequelizeValidationError') {
    return error.errors?.map((e) => e.message).join(', ') || 'Validation error';
  }
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return 'Invalid companyId or user reference';
  }
  return error.message || 'Operation failed';
};

// Get all departments (in real usage: filter by companyId almost always)
exports.getAllDepartments = async (req, res) => {
  try {
    const where = {};
    if (req.query.companyId) where.companyId = req.query.companyId;

    const departments = await Department.findAll({
      where,
      paranoid: false,
      include: [
        { model: require('../models').Company, as: 'company' },
        
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
      paranoid: false,
      include: [
        { model: require('../models').Company, as: 'company' },
        
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
    const payload = {
      ...req.body,
      status: normalizeStatus(req.body?.status),
    };
    const department = await Department.create(payload);
    res.status(201).json(department);
  } catch (error) {
    const statusCode = error.name?.startsWith('Sequelize') ? 400 : 500;
    res.status(statusCode).json({ error: formatSequelizeError(error) });
  }
};

// Update department
exports.updateDepartment = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      ...(req.body?.status ? { status: normalizeStatus(req.body.status) } : {}),
    };

    const [updated] = await Department.update(payload, {
      where: { departmentId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const department = await Department.findByPk(req.params.id);
    res.json(department);
  } catch (error) {
    const statusCode = error.name?.startsWith('Sequelize') ? 400 : 500;
    res.status(statusCode).json({ error: formatSequelizeError(error) });
  }
};

// "Delete" department by setting status inactive (no hard/soft delete)
exports.deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id, { paranoid: false });
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    if (department.deletedAt) {
      await department.restore();
    }

    await department.update({
      status: 'Inactive',
      updatedBy: req.body?.updatedBy || department.updatedBy,
    });

    res.json({ message: 'Department marked as inactive successfully' });
  } catch (error) {
    const statusCode = error.name?.startsWith('Sequelize') ? 400 : 500;
    res.status(statusCode).json({ error: formatSequelizeError(error) });
  }
};
