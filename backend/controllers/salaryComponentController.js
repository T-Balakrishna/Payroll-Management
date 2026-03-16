import db from '../models/index.js';
import { resolveCompanyContext } from '../utils/companyScope.js';
import formulaEvaluator from './formulaEvaluator.js';

const { SalaryComponent, Company, Sequelize } = db;
const { Op } = Sequelize;
const PROFESSIONAL_TAX_FORMULA = '(isProfessionalTaxMonth == 1) ? (sixMonthGrossAverage <= 20000 ? 0 : sixMonthGrossAverage <= 30000 ? 135 : sixMonthGrossAverage <= 45000 ? 315 : sixMonthGrossAverage <= 60000 ? 690 : sixMonthGrossAverage <= 75000 ? 1025 : 1250) : 0';
const PROFESSIONAL_TAX_CODE = 'PROFESSIONAL_TAX';
const PROFESSIONAL_TAX_NAME = 'Professional Tax';

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

const isProfessionalTaxComponent = ({ code, name, type }) => {
  const normalizedCode = String(code || '').trim().toUpperCase();
  const normalizedName = String(name || '').trim().toLowerCase();
  const normalizedType = String(type || '').trim();
  const codeMatch = normalizedCode === 'PT' ||
    normalizedCode === 'PTAX' ||
    normalizedCode === 'PROFESSIONAL_TAX' ||
    normalizedCode === 'PROFESSIONALTAX';
  const nameMatch = normalizedName === 'professional tax';
  return (codeMatch || nameMatch) && (!normalizedType || normalizedType === 'Deduction');
};

const applyProfessionalTaxHardcoding = (payload, fallback = {}) => {
  const candidate = {
    code: Object.prototype.hasOwnProperty.call(payload, 'code') ? payload.code : fallback.code,
    name: Object.prototype.hasOwnProperty.call(payload, 'name') ? payload.name : fallback.name,
    type: Object.prototype.hasOwnProperty.call(payload, 'type') ? payload.type : fallback.type,
  };
  if (!isProfessionalTaxComponent(candidate)) return payload;

  return {
    ...payload,
    type: 'Deduction',
    calculationType: 'Formula',
    formula: PROFESSIONAL_TAX_FORMULA,
    isStatutory: true,
  };
};

const ensureProfessionalTaxComponent = async (companyId) => {
  if (!companyId) return;

  const codeCandidates = ['PT', 'PTAX', 'PROFESSIONAL_TAX', 'PROFESSIONALTAX'];
  const nameCandidates = ['Professional Tax', 'professional tax'];

  const existing = await SalaryComponent.findOne({
    where: {
      companyId,
      [Op.or]: [
        { code: { [Op.in]: codeCandidates } },
        { name: { [Op.in]: nameCandidates } },
      ],
    },
  });

  if (!existing) {
    await SalaryComponent.create({
      companyId,
      name: PROFESSIONAL_TAX_NAME,
      code: PROFESSIONAL_TAX_CODE,
      type: 'Deduction',
      calculationType: 'Formula',
      formula: PROFESSIONAL_TAX_FORMULA,
      affectsGrossSalary: false,
      affectsNetSalary: true,
      isTaxable: false,
      isStatutory: true,
      status: 'Active',
      displayOrder: 999,
    });
    return;
  }

  const needsUpdate =
    existing.type !== 'Deduction' ||
    existing.calculationType !== 'Formula' ||
    existing.formula !== PROFESSIONAL_TAX_FORMULA ||
    existing.isStatutory !== true;

  if (needsUpdate) {
    await SalaryComponent.update(
      {
        type: 'Deduction',
        calculationType: 'Formula',
        formula: PROFESSIONAL_TAX_FORMULA,
        isStatutory: true,
      },
      { where: { salaryComponentId: existing.salaryComponentId } }
    );
  }
};

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

    if (where.companyId) {
      await ensureProfessionalTaxComponent(where.companyId);
    }

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
    const hardenedPayload = applyProfessionalTaxHardcoding(payload);

    if (Object.prototype.hasOwnProperty.call(hardenedPayload, 'formula')) {
      hardenedPayload.formula = normalizeFormulaOperators(hardenedPayload.formula).trim();
    }

    const intendedType = hardenedPayload.type;
    const intendedCalculationType =
      intendedType === 'Deduction'
        ? 'Formula'
        : (hardenedPayload.calculationType === 'Formula' ? 'Formula' : 'Fixed');

    await validateFormulaOrThrow({
      formula: hardenedPayload.formula,
      companyId: hardenedPayload.companyId,
      componentType: intendedType,
      calculationType: intendedCalculationType,
    });

    hardenedPayload.calculationType = intendedCalculationType;

    if (hardenedPayload.calculationType !== 'Formula') {
      hardenedPayload.formula = null;
    }

    const salaryComponent = await SalaryComponent.create(hardenedPayload);
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

    const existingComponent = await SalaryComponent.findByPk(req.params.id);
    if (!existingComponent) {
      return res.status(404).json({ message: 'Salary component not found' });
    }
    const hardenedPayload = applyProfessionalTaxHardcoding(payload, existingComponent || {});

    if (Object.prototype.hasOwnProperty.call(hardenedPayload, 'formula')) {
      hardenedPayload.formula = normalizeFormulaOperators(hardenedPayload.formula).trim();
    }

    if (companyContext.actor && !companyContext.isSuperAdmin) {
      delete hardenedPayload.companyId;
    } else if (hasCompanyIdInPayload && !companyContext.requestedCompanyId) {
      return res.status(400).json({ error: 'companyId must be a positive integer when provided' });
    }

    const resultingType = hardenedPayload.type || existingComponent.type;
    const resultingCalculationType = hardenedPayload.calculationType || existingComponent.calculationType;
    const effectiveCalculationType =
      resultingType === 'Deduction'
        ? 'Formula'
        : (resultingCalculationType === 'Formula' ? 'Formula' : 'Fixed');
    const resultingCompanyId =
      (companyContext.actor && !companyContext.isSuperAdmin
        ? companyContext.effectiveCompanyId
        : hardenedPayload.companyId || existingComponent.companyId);
    const resultingFormula =
      Object.prototype.hasOwnProperty.call(hardenedPayload, 'formula')
        ? hardenedPayload.formula
        : existingComponent.formula;

    await validateFormulaOrThrow({
      formula: resultingFormula,
      companyId: resultingCompanyId,
      componentType: resultingType,
      calculationType: effectiveCalculationType,
      excludeComponentId: existingComponent.salaryComponentId,
    });

    hardenedPayload.calculationType = effectiveCalculationType;

    if (hardenedPayload.calculationType !== 'Formula') {
      hardenedPayload.formula = null;
    }

    const [updated] = await SalaryComponent.update(hardenedPayload, {
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
