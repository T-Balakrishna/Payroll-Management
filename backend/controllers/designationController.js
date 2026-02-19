import db from '../models/index.js';
import { resolveCompanyContext } from '../utils/companyScope.js';
const { Designation } = db;
const normalizeStatus = (status) => {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'inactive') return 'Inactive';
  if (value === 'archived') return 'Archived';
  return 'Active';
};

const formatSequelizeError = (error) => {
  if (!error) return 'Operation failed';
  if (error.name === 'SequelizeUniqueConstraintError') {
    return 'Designation already exists in this company';
  }
  if (error.name === 'SequelizeValidationError') {
    return error.errors?.map((e) => e.message).join(', ') || 'Validation error';
  }
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return 'Invalid companyId or user reference';
  }
  return error.message || 'Operation failed';
};

// Get all designations (in practice: almost always filtered by companyId)
export const getAllDesignations = async (req, res) => {
  try {
    const where = {};
    if (req.query.companyId) where.companyId = req.query.companyId;

    const designations = await Designation.findAll({
      where,
      paranoid: false, // include soft-deleted rows as well
      include: [
        { model: db.Company, as: 'company' },
        
        // { model: db.Employee, as: 'employees' }   // ← include only when really needed (can be large)
      ]
    });
    res.json(designations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single designation by ID
export const getDesignationById = async (req, res) => {
  try {
    const designation = await Designation.findByPk(req.params.id, {
      paranoid: false,
      include: [
        { model: db.Company, as: 'company' },
        
        // { model: db.Employee, as: 'employees' }
      ]
    });

    if (!designation) {
      return res.status(404).json({ message: 'Designation not found' });
    }

    res.json(designation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new designation
export const createDesignation = async (req, res) => {
  try {
    const companyContext = await resolveCompanyContext(req, {
      requireCompanyId: true,
      payloadCompanyId: req.body?.companyId,
    });
    if (!companyContext.ok) {
      return res.status(companyContext.status).json({ error: companyContext.message });
    }

    const payload = {
      ...req.body,
      companyId: companyContext.effectiveCompanyId,
      status: normalizeStatus(req.body?.status),
    };
    const designation = await Designation.create(payload);
    res.status(201).json(designation);
  } catch (error) {
    const statusCode = error.name?.startsWith('Sequelize') ? 400 : 500;
    res.status(statusCode).json({ error: formatSequelizeError(error) });
  }
};

// Update designation
export const updateDesignation = async (req, res) => {
  try {
    const hasCompanyIdInPayload = Object.prototype.hasOwnProperty.call(req.body || {}, 'companyId');
    const companyContext = await resolveCompanyContext(req, {
      requireCompanyId: false,
      payloadCompanyId: hasCompanyIdInPayload ? req.body.companyId : undefined,
    });
    if (!companyContext.ok) {
      return res.status(companyContext.status).json({ error: companyContext.message });
    }

    const payload = {
      ...req.body,
      ...(req.body?.status ? { status: normalizeStatus(req.body.status) } : {}),
    };
    if (companyContext.actor && !companyContext.isSuperAdmin) {
      delete payload.companyId;
    } else if (hasCompanyIdInPayload && !companyContext.requestedCompanyId) {
      return res.status(400).json({ error: 'companyId must be a positive integer when provided' });
    }

    const [updated] = await Designation.update(payload, {
      where: {
        designationId: req.params.id,
        ...(companyContext.actor && !companyContext.isSuperAdmin
          ? { companyId: companyContext.effectiveCompanyId }
          : {}),
      }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Designation not found' });
    }

    const designation = await Designation.findByPk(req.params.id);
    res.json(designation);
  } catch (error) {
    const statusCode = error.name?.startsWith('Sequelize') ? 400 : 500;
    res.status(statusCode).json({ error: formatSequelizeError(error) });
  }
};

// "Delete" designation by setting status inactive (no hard/soft delete)
export const deleteDesignation = async (req, res) => {
  try {
    const designation = await Designation.findByPk(req.params.id, { paranoid: false });
    if (!designation) {
      return res.status(404).json({ message: 'Designation not found' });
    }

    // If this row was soft-deleted in the past, bring it back first.
    if (designation.deletedAt) {
      await designation.restore();
    }

    await designation.update({
      status: 'Inactive',
      updatedBy: req.body?.updatedBy || designation.updatedBy,
    });

    res.json({ message: 'Designation marked as inactive successfully' });
  } catch (error) {
    const statusCode = error.name?.startsWith('Sequelize') ? 400 : 500;
    res.status(statusCode).json({ error: formatSequelizeError(error) });
  }
};
