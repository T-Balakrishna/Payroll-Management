import db from '../models/index.js';

const { EmployeeSalaryComponent, SalaryComponent } = db;
const primaryKey = EmployeeSalaryComponent.primaryKeyAttribute || 'employeeSalaryComponentid';

const toNonNegativeNumber = (value, fieldName) => {
  const parsed = Number.parseFloat(String(value));
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be a non-negative number`);
  }
  return parsed;
};

const hasValue = (value) => value !== null && value !== undefined && String(value).trim() !== '';

const buildAssignmentPayload = async ({ body, existingRecord = null }) => {
  const componentId = body?.componentId ?? existingRecord?.componentId;
  if (!componentId) {
    throw new Error('componentId is required');
  }

  const salaryComponent = await SalaryComponent.findByPk(componentId);
  if (!salaryComponent) {
    throw new Error('Referenced salary component not found');
  }

  const employeeSalaryMasterId = body?.employeeSalaryMasterId ?? existingRecord?.employeeSalaryMasterId;
  if (!employeeSalaryMasterId) {
    throw new Error('employeeSalaryMasterId is required');
  }

  const payload = {
    ...body,
    employeeSalaryMasterId,
    componentId: salaryComponent.salaryComponentId,
    componentName: salaryComponent.name,
    componentCode: salaryComponent.code,
    componentType: salaryComponent.type,
    isStatutory: salaryComponent.isStatutory,
    isTaxable: salaryComponent.isTaxable,
    affectsGrossSalary: salaryComponent.affectsGrossSalary,
    affectsNetSalary: salaryComponent.affectsNetSalary,
    displayOrder: body?.displayOrder ?? existingRecord?.displayOrder ?? salaryComponent.displayOrder ?? 0,
  };

  if (salaryComponent.type === 'Earning') {
    if (salaryComponent.calculationType === 'Formula') {
      if (!salaryComponent.formula || !String(salaryComponent.formula).trim()) {
        throw new Error('Earning component must have formula at component level');
      }

      const calculatedAmount = hasValue(body?.calculatedAmount)
        ? toNonNegativeNumber(body.calculatedAmount, 'calculatedAmount')
        : toNonNegativeNumber(existingRecord?.calculatedAmount ?? 0, 'calculatedAmount');

      payload.valueType = 'Formula';
      payload.fixedAmount = null;
      payload.percentageValue = null;
      payload.percentageBase = null;
      payload.formulaId = body?.formulaId ?? existingRecord?.formulaId ?? null;
      payload.formulaExpression = salaryComponent.formula;
      payload.calculatedAmount = calculatedAmount;
      payload.annualAmount = hasValue(body?.annualAmount)
        ? toNonNegativeNumber(body.annualAmount, 'annualAmount')
        : Number((calculatedAmount * 12).toFixed(2));
    } else {
      if (!hasValue(body?.fixedAmount) && !hasValue(existingRecord?.fixedAmount)) {
        throw new Error('fixedAmount is required for Earning component assignment');
      }

      const fixedAmount = toNonNegativeNumber(
        hasValue(body?.fixedAmount) ? body.fixedAmount : existingRecord.fixedAmount,
        'fixedAmount'
      );

      const calculatedAmount = hasValue(body?.calculatedAmount)
        ? toNonNegativeNumber(body.calculatedAmount, 'calculatedAmount')
        : fixedAmount;

      payload.valueType = 'Fixed';
      payload.fixedAmount = fixedAmount;
      payload.percentageValue = null;
      payload.percentageBase = null;
      payload.formulaId = null;
      payload.formulaExpression = null;
      payload.calculatedAmount = calculatedAmount;
      payload.annualAmount = hasValue(body?.annualAmount)
        ? toNonNegativeNumber(body.annualAmount, 'annualAmount')
        : Number((calculatedAmount * 12).toFixed(2));
    }
  } else if (salaryComponent.type === 'Deduction') {
    if (!salaryComponent.formula || !String(salaryComponent.formula).trim()) {
      throw new Error('Deduction component must have formula at component level');
    }

    const calculatedAmount = hasValue(body?.calculatedAmount)
      ? toNonNegativeNumber(body.calculatedAmount, 'calculatedAmount')
      : 0;

    payload.valueType = 'Formula';
    payload.fixedAmount = null;
    payload.percentageValue = null;
    payload.percentageBase = null;
    payload.formulaId = body?.formulaId ?? existingRecord?.formulaId ?? null;
    payload.formulaExpression = salaryComponent.formula;
    payload.calculatedAmount = calculatedAmount;
    payload.annualAmount = hasValue(body?.annualAmount)
      ? toNonNegativeNumber(body.annualAmount, 'annualAmount')
      : Number((calculatedAmount * 12).toFixed(2));
  } else {
    throw new Error('Invalid component type');
  }

  return payload;
};

export const getAllEmployeeSalaryComponents = async (req, res) => {
  try {
    const where = {};
    if (req.query.employeeSalaryMasterId) {
      where.employeeSalaryMasterId = req.query.employeeSalaryMasterId;
    }

    const components = await EmployeeSalaryComponent.findAll({
      where,
      include: [],
    });

    res.json(components);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getEmployeeSalaryComponentById = async (req, res) => {
  try {
    const component = await EmployeeSalaryComponent.findByPk(req.params.id, {
      include: [],
    });

    if (!component) {
      return res.status(404).json({ message: 'Employee salary component not found' });
    }

    res.json(component);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createEmployeeSalaryComponent = async (req, res) => {
  try {
    const payload = await buildAssignmentPayload({ body: req.body });
    const component = await EmployeeSalaryComponent.create(payload);
    res.status(201).json(component);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateEmployeeSalaryComponent = async (req, res) => {
  try {
    const existingRecord = await EmployeeSalaryComponent.findByPk(req.params.id);
    if (!existingRecord) {
      return res.status(404).json({ message: 'Employee salary component not found' });
    }

    const payload = await buildAssignmentPayload({ body: req.body, existingRecord });

    const [updated] = await EmployeeSalaryComponent.update(payload, {
      where: { [primaryKey]: req.params.id },
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

export const deleteEmployeeSalaryComponent = async (req, res) => {
  try {
    const deleted = await EmployeeSalaryComponent.destroy({
      where: { [primaryKey]: req.params.id },
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Employee salary component not found' });
    }

    res.json({ message: 'Employee salary component deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
