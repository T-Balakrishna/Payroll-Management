const { Op } = require('sequelize');
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
    console.error('[getAllDepartments] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch departments',
      details: error.message,
    });
  }
};

/**
 * GET /departments/:id
 */
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
      return res.status(404).json({ error: 'Department not found' });
    }

    res.status(200).json(department);
  } catch (error) {
    console.error('[getDepartmentById] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch department',
      details: error.message,
    });
  }
};

/**
 * POST /departments
 */
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

/**
 * PUT /departments/:id
 */
exports.updateDepartment = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      ...(req.body?.status ? { status: normalizeStatus(req.body.status) } : {}),
    };

    const [affectedCount] = await Department.update(payload, {
      where: { departmentId: req.params.id }
    });

    if (affectedCount === 0) {
      return res.status(404).json({ error: 'Department not found or no changes' });
    }

    const updatedDepartment = await Department.findByPk(req.params.id, { paranoid: false });
    res.status(200).json(updatedDepartment);
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
