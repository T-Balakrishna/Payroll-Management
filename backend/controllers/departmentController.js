const { Op } = require('sequelize');
const { Department } = require('../models');

// ────────────────────────────────────────────────
//  HELPERS
// ────────────────────────────────────────────────

const sendError = (res, status, message, error = null) => {
  const response = { message };
  if (error && process.env.NODE_ENV !== 'production') {
    response.error = error.message;
  }
  return res.status(status).json(response);
};

// ────────────────────────────────────────────────
//  CONTROLLERS
// ────────────────────────────────────────────────

/**
 * GET /departments
 * List departments with optional filters
 * Query params:
 *   - companyId (integer)
 *   - status    ('Active' | 'Inactive' | 'Archived')
 *   - (future: page, limit, search)
 */
exports.getAllDepartments = async (req, res) => {
  try {
    const { companyId, status } = req.query;

    const where = {};

    if (companyId) {
      where.companyId = Number(companyId); // explicit conversion + NaN safety
      if (isNaN(where.companyId)) {
        return sendError(res, 400, 'companyId must be a valid integer');
      }
    }

    if (status) {
      if (!['Active', 'Inactive', 'Archived'].includes(status)) {
        return sendError(res, 400, 'Invalid status value');
      }
      where.status = status;
    } else {
      // Default: only show Active departments (most common use-case)
      where.status = 'Active';
    }

    const departments = await Department.findAll({
      where,
      attributes: [
        'departmentId',
        'departmentName',
        'departmentAcr',
        'companyId',
        'status',
        'createdAt',
        'updatedAt',
      ],
      order: [['departmentName', 'ASC']],
      // Optional future pagination (uncomment when needed)
      // limit: limit ? Math.min(Number(limit), 100) : undefined,
      // offset: page && limit ? (page - 1) * limit : undefined,
    });

    res.status(200).json(departments);
  } catch (error) {
    console.error('[getAllDepartments] Error:', error);
    sendError(res, 500, 'Failed to fetch departments', error);
  }
};

/**
 * GET /departments/:id
 */
exports.getDepartmentById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return sendError(res, 400, 'Invalid department ID');
    }

    const department = await Department.findByPk(id, {
      attributes: [
        'departmentId',
        'departmentName',
        'departmentAcr',
        'companyId',
        'status',
        'createdAt',
        'updatedAt',
      ],
      // include: [{ model: require('../models').Company, as: 'company', attributes: ['companyName'] }],
    });

    if (!department) {
      return sendError(res, 404, 'Department not found');
    }

    res.status(200).json(department);
  } catch (error) {
    console.error('[getDepartmentById] Error:', error);
    sendError(res, 500, 'Failed to fetch department', error);
  }
};

/**
 * POST /departments
 */
exports.createDepartment = async (req, res) => {
  try {
    const {
      departmentName,
      departmentAcr,
      companyId,
      status = 'Active',
      createdBy,
    } = req.body;

    // Basic validation
    if (!departmentName || !departmentAcr || !companyId) {
      return sendError(res, 400, 'departmentName, departmentAcr and companyId are required');
    }

    const department = await Department.create({
      departmentName: departmentName.trim(),
      departmentAcr: departmentAcr.trim().toUpperCase(),
      companyId: Number(companyId),
      status,
      createdBy: createdBy || null, // or req.user?.userId if you have auth middleware
    });

    res.status(201).json(department);
  } catch (error) {
    console.error('[createDepartment] Error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return sendError(res, 409, 'Department name or acronym already exists for this company');
    }
    sendError(res, 500, 'Failed to create department', error);
  }
};

/**
 * PUT /departments/:id
 */
exports.updateDepartment = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return sendError(res, 400, 'Invalid department ID');

    const [affectedCount] = await Department.update(req.body, {
      where: { departmentId: id },
      individualHooks: true, // triggers before/after update hooks if any
    });

    if (affectedCount === 0) {
      return sendError(res, 404, 'Department not found or no changes');
    }

    const updated = await Department.findByPk(id);
    res.status(200).json(updated);
  } catch (error) {
    console.error('[updateDepartment] Error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return sendError(res, 409, 'Department name or acronym conflict');
    }
    sendError(res, 500, 'Failed to update department', error);
  }
};

/**
 * DELETE /departments/:id
 * Soft delete (paranoid: true)
 */
exports.deleteDepartment = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return sendError(res, 400, 'Invalid department ID');

    const deletedCount = await Department.destroy({
      where: { departmentId: id },
      // force: false  ← default = soft delete
    });

    if (deletedCount === 0) {
      return sendError(res, 404, 'Department not found');
    }

    res.status(200).json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('[deleteDepartment] Error:', error);
    sendError(res, 500, 'Failed to delete department', error);
  }
};