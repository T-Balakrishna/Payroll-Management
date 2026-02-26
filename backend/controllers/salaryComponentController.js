import db from '../models/index.js';
import { resolveCompanyContext } from '../utils/companyScope.js';
import formulaEvaluator from './formulaEvaluator.js';

const { SalaryComponent, Company } = db;

const formatSequelizeError = (error) => {
  if (!error) return 'Operation failed';
  if (error.name === 'SequelizeUniqueConstraintError') {
    return 'Salary component code or name already exists in this company';
  }
  if (error.name === 'SequelizeValidationError') {
    return error.errors?.map((e) => e.message).join(', ') || 'Validation error';
  }
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return 'Invalid companyId or user reference';
  }
  return error.message || 'Operation failed';
};

const normalizeStatus = (status) => {
  const value = String(status || '').trim().toLowerCase();
  return value === 'inactive' ? 'Inactive' : 'Active';
};

const normalizeFormulaOperators = (formula) =>
  String(formula || '').replace(/!==/g, '!=').replace(/===/g, '==');

const validateFormulaOrThrow = async ({
  formula,
  companyId,
  componentType,
  calculationType,
  excludeComponentId = null,
}) => {
  if (calculationType !== 'Formula') return;

  const normalizedFormula = normalizeFormulaOperators(formula).trim();
  if (!normalizedFormula) {
    throw new Error(`Formula is required for ${String(componentType || 'component').toLowerCase()} component`);
  }

  const componentWhere = { companyId };
  if (excludeComponentId) {
    componentWhere.salaryComponentId = { [db.Sequelize.Op.ne]: excludeComponentId };
  }

  const components = await SalaryComponent.findAll({
    where: componentWhere,
    attributes: ['code'],
  });

  formulaEvaluator.setAllowedComponents(components.map((c) => c.code));
  const validation = formulaEvaluator.validateFormula(normalizedFormula);
  if (!validation.valid) {
    throw new Error(`Invalid formula: ${validation.error}`);
  }
};

export const getAllSalaryComponents = async (req, res) => {
  try {
    const where = {};
    if (req.query.companyId) where.companyId = req.query.companyId;

    const salaryComponents = await SalaryComponent.findAll({
      where,
      include: [{ model: Company, as: 'company' }],
      order: [
        ['displayOrder', 'ASC'],
        ['name', 'ASC'],
      ],
    });
    res.json(salaryComponents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getSalaryComponentById = async (req, res) => {
  try {
    const salaryComponent = await SalaryComponent.findByPk(req.params.id, {
      include: [{ model: Company, as: 'company' }],
    });

    if (!salaryComponent) {
      return res.status(404).json({ message: 'Salary component not found' });
    }

    res.json(salaryComponent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createSalaryComponent = async (req, res) => {
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

    if (Object.prototype.hasOwnProperty.call(payload, 'formula')) {
      payload.formula = normalizeFormulaOperators(payload.formula).trim();
    }

    const intendedType = payload.type;
    const intendedCalculationType =
      intendedType === 'Deduction'
        ? 'Formula'
        : (payload.calculationType === 'Formula' ? 'Formula' : 'Fixed');

    await validateFormulaOrThrow({
      formula: payload.formula,
      companyId: payload.companyId,
      componentType: intendedType,
      calculationType: intendedCalculationType,
    });

    payload.calculationType = intendedCalculationType;

    if (payload.calculationType !== 'Formula') {
      payload.formula = null;
    }

    const salaryComponent = await SalaryComponent.create(payload);
    res.status(201).json(salaryComponent);
  } catch (error) {
    const statusCode = error.name?.startsWith('Sequelize') ? 400 : 500;
    res.status(statusCode).json({ error: formatSequelizeError(error) });
  }
};

export const updateSalaryComponent = async (req, res) => {
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

    if (Object.prototype.hasOwnProperty.call(payload, 'formula')) {
      payload.formula = normalizeFormulaOperators(payload.formula).trim();
    }

    const existingComponent = await SalaryComponent.findByPk(req.params.id);
    if (!existingComponent) {
      return res.status(404).json({ message: 'Salary component not found' });
    }

    if (companyContext.actor && !companyContext.isSuperAdmin) {
      delete payload.companyId;
    } else if (hasCompanyIdInPayload && !companyContext.requestedCompanyId) {
      return res.status(400).json({ error: 'companyId must be a positive integer when provided' });
    }

    const resultingType = payload.type || existingComponent.type;
    const resultingCalculationType = payload.calculationType || existingComponent.calculationType;
    const effectiveCalculationType =
      resultingType === 'Deduction'
        ? 'Formula'
        : (resultingCalculationType === 'Formula' ? 'Formula' : 'Fixed');
    const resultingCompanyId =
      (companyContext.actor && !companyContext.isSuperAdmin
        ? companyContext.effectiveCompanyId
        : payload.companyId || existingComponent.companyId);
    const resultingFormula =
      Object.prototype.hasOwnProperty.call(payload, 'formula')
        ? payload.formula
        : existingComponent.formula;

    await validateFormulaOrThrow({
      formula: resultingFormula,
      companyId: resultingCompanyId,
      componentType: resultingType,
      calculationType: effectiveCalculationType,
      excludeComponentId: existingComponent.salaryComponentId,
    });

    payload.calculationType = effectiveCalculationType;

    if (payload.calculationType !== 'Formula') {
      payload.formula = null;
    }

    const [updated] = await SalaryComponent.update(payload, {
      where: {
        salaryComponentId: req.params.id,
        ...(companyContext.actor && !companyContext.isSuperAdmin
          ? { companyId: companyContext.effectiveCompanyId }
          : {}),
      },
    });

    if (!updated) {
      return res.status(404).json({ message: 'Salary component not found' });
    }

    const salaryComponent = await SalaryComponent.findByPk(req.params.id);
    res.json(salaryComponent);
  } catch (error) {
    const statusCode = error.name?.startsWith('Sequelize') ? 400 : 500;
    res.status(statusCode).json({ error: formatSequelizeError(error) });
  }
};

export const deleteSalaryComponent = async (req, res) => {
  try {
    const deleted = await SalaryComponent.destroy({
      where: { salaryComponentId: req.params.id },
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Salary component not found' });
    }

    res.json({ message: 'Salary component deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
