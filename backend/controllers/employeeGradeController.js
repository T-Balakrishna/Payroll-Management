import db from '../models/index.js';
import { resolveCompanyContext } from '../utils/companyScope.js';
const { EmployeeGrade, Company } = db;

const formatSequelizeError = (error) => {
  if (!error) return 'Operation failed';
  if (error.name === 'SequelizeUniqueConstraintError') {
    return 'Employee grade already exists in this company';
  }
  if (error.name === 'SequelizeValidationError') {
    return error.errors?.map((e) => e.message).join(', ') || 'Validation error';
  }
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return 'Invalid companyId or user reference';
  }
  return error.message || 'Operation failed';
};
// Get all employee grades
export const getAllEmployeeGrades = async (req, res) => {
  try {
    const { companyId } = req.query;
    const where = {};
    if (companyId) where.companyId = companyId;

    const employeeGrades = await EmployeeGrade.findAll({
      where,
      include: [{ model: Company, as: "company" }],
      order: [["employeeGradeName", "ASC"]],
    });
    res.json(employeeGrades);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single employee grade by ID
export const getEmployeeGradeById = async (req, res) => {
  try {
    const employeeGrade = await EmployeeGrade.findByPk(req.params.id, {
      include: [{ model: Company, as: "company" }],
    });

    if (!employeeGrade) {
      return res.status(404).json({ message: "Employee grade not found" });
    }

    res.json(employeeGrade);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new employee grade
export const createEmployeeGrade = async (req, res) => {
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
    };
    const employeeGrade = await EmployeeGrade.create(payload);
    res.status(201).json(employeeGrade);
  } catch (error) {
    const statusCode = error.name?.startsWith('Sequelize') ? 400 : 500;
    res.status(statusCode).json({ error: formatSequelizeError(error) });
  }
};

// Update employee grade
export const updateEmployeeGrade = async (req, res) => {
  try {
    const hasCompanyIdInPayload = Object.prototype.hasOwnProperty.call(req.body || {}, 'companyId');
    const companyContext = await resolveCompanyContext(req, {
      requireCompanyId: false,
      payloadCompanyId: hasCompanyIdInPayload ? req.body.companyId : undefined,
    });
    if (!companyContext.ok) {
      return res.status(companyContext.status).json({ error: companyContext.message });
    }

    const payload = { ...req.body };
    if (companyContext.actor && !companyContext.isSuperAdmin) {
      delete payload.companyId;
    } else if (hasCompanyIdInPayload && !companyContext.requestedCompanyId) {
      return res.status(400).json({ error: 'companyId must be a positive integer when provided' });
    }

    const [updated] = await EmployeeGrade.update(payload, {
      where: {
        employeeGradeId: req.params.id,
        ...(companyContext.actor && !companyContext.isSuperAdmin
          ? { companyId: companyContext.effectiveCompanyId }
          : {}),
      },
    });

    if (!updated) {
      return res.status(404).json({ message: "Employee grade not found" });
    }

    const employeeGrade = await EmployeeGrade.findByPk(req.params.id);
    res.json(employeeGrade);
  } catch (error) {
    const statusCode = error.name?.startsWith('Sequelize') ? 400 : 500;
    res.status(statusCode).json({ error: formatSequelizeError(error) });
  }
};

// Delete employee grade (soft delete supported via paranoid: true)
export const deleteEmployeeGrade = async (req, res) => {
  try {
    const deleted = await EmployeeGrade.destroy({
      where: { employeeGradeId: req.params.id },
    });

    if (!deleted) {
      return res.status(404).json({ message: "Employee grade not found" });
    }

    res.json({ message: "Employee grade deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
