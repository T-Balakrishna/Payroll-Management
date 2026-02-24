import db from '../models/index.js';

const { EmployeeSalaryMaster, EmployeeSalaryComponent, SalaryComponent, Employee } = db;

const toNonNegativeNumber = (value, fieldName) => {
  const parsed = Number.parseFloat(String(value));
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be a non-negative number`);
  }
  return parsed;
};

const parseOptionalInt = (value) => {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

const recalculateSalaryMasterTotals = async (employeeSalaryMasterId, transaction) => {
  const components = await EmployeeSalaryComponent.findAll({
    where: { employeeSalaryMasterId },
    transaction,
  });

  const grossSalary = components
    .filter((c) => c.componentType === 'Earning')
    .reduce((sum, c) => sum + Number(c.calculatedAmount || 0), 0);

  const totalDeductions = components
    .filter((c) => c.componentType === 'Deduction')
    .reduce((sum, c) => sum + Number(c.calculatedAmount || 0), 0);

  const basicComponent = components.find((c) => String(c.componentCode || '').toUpperCase() === 'BASIC');
  const basicSalary = Number(basicComponent?.calculatedAmount || 0);
  const netSalary = Number((grossSalary - totalDeductions).toFixed(2));
  const ctcMonthly = Number(grossSalary.toFixed(2));
  const ctcAnnual = Number((ctcMonthly * 12).toFixed(2));

  await EmployeeSalaryMaster.update(
    {
      basicSalary,
      grossSalary: Number(grossSalary.toFixed(2)),
      totalDeductions: Number(totalDeductions.toFixed(2)),
      netSalary,
      ctcMonthly,
      ctcAnnual,
    },
    {
      where: { employeeSalaryMasterId },
      transaction,
    }
  );

  return {
    basicSalary,
    grossSalary: Number(grossSalary.toFixed(2)),
    totalDeductions: Number(totalDeductions.toFixed(2)),
    netSalary,
    ctcMonthly,
    ctcAnnual,
  };
};

export const getAllEmployeeSalaryMasters = async (req, res) => {
  try {
    const where = {};

    const staffId = parseOptionalInt(req.query.staffId);
    const companyId = parseOptionalInt(req.query.companyId);
    const status = String(req.query.status || '').trim();

    if (staffId) where.staffId = staffId;
    if (companyId) where.companyId = companyId;
    if (status) where.status = status;

    const include = [
      { model: db.Employee, as: 'employees' },
      { model: db.Company, as: 'company' },
      { model: db.EmployeeSalaryMaster, as: 'previousSalary' },
      { model: db.User, as: 'approver' },
    ];

    if (String(req.query.includeComponents || '').toLowerCase() === 'true') {
      include.push({ model: db.EmployeeSalaryComponent, as: 'components' });
    }

    const salaryMasters = await EmployeeSalaryMaster.findAll({
      where,
      include,
      order: [
        ['effectiveFrom', 'DESC'],
        ['employeeSalaryMasterId', 'DESC'],
      ],
    });

    res.json(salaryMasters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getEmployeeSalaryMasterById = async (req, res) => {
  try {
    const include = [
      { model: db.Employee, as: 'employees' },
      { model: db.Company, as: 'company' },
      { model: db.EmployeeSalaryMaster, as: 'previousSalary' },
      { model: db.User, as: 'approver' },
    ];

    if (String(req.query.includeComponents || '').toLowerCase() === 'true') {
      include.push({ model: db.EmployeeSalaryComponent, as: 'components' });
    }

    const salaryMaster = await EmployeeSalaryMaster.findByPk(req.params.id, { include });

    if (!salaryMaster) {
      return res.status(404).json({ message: 'Employee salary master not found' });
    }

    res.json(salaryMaster);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createEmployeeSalaryMaster = async (req, res) => {
  try {
    const salaryMaster = await EmployeeSalaryMaster.create(req.body);
    res.status(201).json(salaryMaster);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateEmployeeSalaryMaster = async (req, res) => {
  try {
    const [updated] = await EmployeeSalaryMaster.update(req.body, {
      where: { employeeSalaryMasterId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Employee salary master not found' });
    }

    const salaryMaster = await EmployeeSalaryMaster.findByPk(req.params.id);
    res.json(salaryMaster);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteEmployeeSalaryMaster = async (req, res) => {
  try {
    const deleted = await EmployeeSalaryMaster.destroy({
      where: { employeeSalaryMasterId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Employee salary master not found' });
    }

    res.json({ message: 'Employee salary master deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const assignEarningComponentToEmployee = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const staffId = parseOptionalInt(req.body.staffId);
    const companyId = parseOptionalInt(req.body.companyId);
    const componentId = parseOptionalInt(req.body.componentId);
    const fixedAmount = toNonNegativeNumber(req.body.fixedAmount, 'fixedAmount');
    const updatedBy = parseOptionalInt(req.body.updatedBy) || null;
    const createdBy = parseOptionalInt(req.body.createdBy) || updatedBy;
    const effectiveFrom = String(req.body.effectiveFrom || new Date().toISOString().slice(0, 10));

    if (!staffId || !companyId || !componentId) {
      throw new Error('staffId, companyId and componentId are required');
    }

    const employee = await Employee.findByPk(staffId, { transaction });
    if (!employee) {
      throw new Error('Employee not found');
    }

    if (String(employee.companyId) !== String(companyId)) {
      throw new Error('Employee does not belong to the selected company');
    }

    const salaryComponent = await SalaryComponent.findByPk(componentId, { transaction });
    if (!salaryComponent) {
      throw new Error('Salary component not found');
    }

    if (String(salaryComponent.companyId) !== String(companyId)) {
      throw new Error('Salary component does not belong to the selected company');
    }

    if (salaryComponent.type !== 'Earning') {
      throw new Error('Only earning components can be assigned from salary assignment page');
    }

    let salaryMaster = await EmployeeSalaryMaster.findOne({
      where: {
        staffId,
        companyId,
        status: 'Active',
      },
      order: [
        ['effectiveFrom', 'DESC'],
        ['employeeSalaryMasterId', 'DESC'],
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!salaryMaster) {
      salaryMaster = await EmployeeSalaryMaster.create(
        {
          staffId,
          companyId,
          effectiveFrom,
          effectiveTo: null,
          basicSalary: 0,
          grossSalary: 0,
          totalDeductions: 0,
          netSalary: 0,
          ctcAnnual: 0,
          ctcMonthly: 0,
          revisionType: 'Initial',
          status: 'Active',
          createdBy,
          updatedBy,
        },
        { transaction }
      );
    }

    let assignment = await EmployeeSalaryComponent.findOne({
      where: {
        employeeSalaryMasterId: salaryMaster.employeeSalaryMasterId,
        componentId: salaryComponent.salaryComponentId,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    const assignmentPayload = {
      employeeSalaryMasterId: salaryMaster.employeeSalaryMasterId,
      componentId: salaryComponent.salaryComponentId,
      componentName: salaryComponent.name,
      componentCode: salaryComponent.code,
      componentType: salaryComponent.type,
      valueType: 'Fixed',
      fixedAmount,
      percentageValue: null,
      percentageBase: null,
      formulaId: null,
      formulaExpression: null,
      calculatedAmount: fixedAmount,
      annualAmount: Number((fixedAmount * 12).toFixed(2)),
      isStatutory: Boolean(salaryComponent.isStatutory),
      isTaxable: Boolean(salaryComponent.isTaxable),
      affectsGrossSalary: Boolean(salaryComponent.affectsGrossSalary),
      affectsNetSalary: Boolean(salaryComponent.affectsNetSalary),
      displayOrder: salaryComponent.displayOrder ?? 0,
      remarks: req.body.remarks || null,
    };

    if (assignment) {
      await assignment.update(assignmentPayload, { transaction });
    } else {
      assignment = await EmployeeSalaryComponent.create(assignmentPayload, { transaction });
    }

    const totals = await recalculateSalaryMasterTotals(salaryMaster.employeeSalaryMasterId, transaction);

    await EmployeeSalaryMaster.update(
      { ...totals, updatedBy },
      {
        where: { employeeSalaryMasterId: salaryMaster.employeeSalaryMasterId },
        transaction,
      }
    );

    const updatedSalaryMaster = await EmployeeSalaryMaster.findByPk(
      salaryMaster.employeeSalaryMasterId,
      {
        include: [{ model: db.EmployeeSalaryComponent, as: 'components' }],
        transaction,
      }
    );

    await transaction.commit();

    res.status(200).json({
      message: 'Earning component assigned successfully',
      salaryMaster: updatedSalaryMaster,
      assignment,
      totals,
    });
  } catch (error) {
    await transaction.rollback();
    res.status(400).json({ error: error.message });
  }
};
