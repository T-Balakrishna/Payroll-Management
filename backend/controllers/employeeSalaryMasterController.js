import db from '../models/index.js';
import formulaEvaluator from './formulaEvaluator.js';

const { EmployeeSalaryMaster, EmployeeSalaryComponent, SalaryComponent, Employee, User, Attendance, LeaveType } = db;
const normalizeRoleName = (value = '') => String(value).toLowerCase().replace(/[\s-]/g, '');
const STAFF_ROLE_KEYS = new Set(['teachingstaff', 'nonteachingstaff']);
const normalizeText = (value = '') => String(value || '').trim().toLowerCase();
const parseLeaveTypeFromStatus = (status = '') => {
  const text = String(status || '').trim();
  if (!/^leave\s*-/i.test(text)) return null;
  return text.replace(/^leave\s*-\s*/i, '').trim();
};

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

const toSafeNumber = (value) => {
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseJsonObject = (value) => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
};

const toOptionalNonNegativeNumber = (value, fieldName) => {
  if (value === null || value === undefined || String(value).trim() === '') return undefined;
  return toNonNegativeNumber(value, fieldName);
};

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const toDateOnlyString = (value) => {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
};

const buildMonthRange = (baseDateValue) => {
  const baseDate = new Date(baseDateValue || new Date());
  const year = baseDate.getUTCFullYear();
  const monthIndex = baseDate.getUTCMonth();
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));
  return {
    start: toDateOnlyString(start),
    end: toDateOnlyString(end),
  };
};

const buildDefaultPayPeriod = (baseDateValue) => {
  const baseDate = new Date(baseDateValue || new Date());
  const year = baseDate.getUTCFullYear();
  const monthIndex = baseDate.getUTCMonth();
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));
  return {
    payDate: toDateOnlyString(baseDate),
    payPeriodStart: toDateOnlyString(start),
    payPeriodEnd: toDateOnlyString(end),
  };
};

const setContextValue = (context, key, value) => {
  const normalizedKey = String(key || '').trim();
  if (!normalizedKey) return;
  context[normalizedKey] = value;
  context[normalizedKey.toUpperCase()] = value;
  context[normalizedKey.toLowerCase()] = value;
};

const buildFormulaContext = async ({
  companyId,
  employeeSalaryMasterId,
  formulaDate,
  payPeriodStart,
  payPeriodEnd,
  presentDaysOverride,
  leaveDaysOverride,
  lossOfPayLeaveOverride,
  transaction,
}) => {
  const employeeSalaryMaster = await EmployeeSalaryMaster.findByPk(employeeSalaryMasterId, { transaction });
  const employee = await Employee.findByPk(employeeSalaryMaster?.staffId, {
    include: [
      { model: db.Department, as: 'department', required: false },
      { model: db.Designation, as: 'designation', required: false },
      { model: db.EmployeeGrade, as: 'employeeGrade', required: false },
      { model: db.Role, as: 'role', required: false },
    ],
    transaction,
  });

  const allActiveComponents = await SalaryComponent.findAll({
    where: {
      companyId,
      status: 'Active',
    },
    attributes: ['code'],
    transaction,
  });
  formulaEvaluator.setAllowedComponents(allActiveComponents.map((c) => c.code));

  const assignedEarnings = await EmployeeSalaryComponent.findAll({
    where: {
      employeeSalaryMasterId,
      componentType: 'Earning',
      valueType: 'Fixed',
    },
    order: [['displayOrder', 'ASC']],
    transaction,
  });

  const context = {};
  // Ensure every active component code exists in context to avoid "X is not defined".
  allActiveComponents.forEach((component) => {
    setContextValue(context, component.code, 0);
  });

  assignedEarnings.forEach((component) => {
    const amount = toSafeNumber(component.calculatedAmount ?? component.fixedAmount);
    setContextValue(context, component.componentCode, amount);
  });

  const today = new Date();
  const joiningDate = employee?.dateOfJoining ? new Date(employee.dateOfJoining) : null;
  const birthDate = employee?.dateOfBirth ? new Date(employee.dateOfBirth) : null;
  const experience = joiningDate ? Math.max(0, (today - joiningDate) / (365.25 * 24 * 60 * 60 * 1000)) : 0;
  const age = birthDate ? Math.max(0, (today - birthDate) / (365.25 * 24 * 60 * 60 * 1000)) : 0;

  context.designation = employee?.designation?.designationName || '';
  context.designationLower = String(context.designation || '').trim().toLowerCase();
  context.department = employee?.department?.departmentName || '';
  context.grade = employee?.employeeGrade?.employeeGradeName || '';
  context.role = employee?.role?.roleName || '';
  context.roleLower = String(context.role || '').trim().toLowerCase();
  context.experience = Number(experience.toFixed(2));
  context.employeeType = employee?.employmentStatus || '';
  context.location = employee?.workLocation || '';
  context.age = Number(age.toFixed(2));
  context.joiningDate = employee?.dateOfJoining || null;
  context.gender = employee?.gender || '';
  context.qualification = employee?.highestQualification || '';

  const derivedPeriod = buildDefaultPayPeriod(formulaDate || employeeSalaryMaster?.effectiveFrom);
  const resolvedPayDate = toDateOnlyString(formulaDate) || derivedPeriod.payDate;
  const resolvedPayPeriodStart = toDateOnlyString(payPeriodStart) || derivedPeriod.payPeriodStart;
  const resolvedPayPeriodEnd = toDateOnlyString(payPeriodEnd) || derivedPeriod.payPeriodEnd;
  const payDateObject = new Date(`${resolvedPayDate}T00:00:00`);

  context.payDate = resolvedPayDate;
  context.payDay = payDateObject.getDate();
  context.payMonth = payDateObject.getMonth() + 1;
  context.payMonthName = MONTH_NAMES[payDateObject.getMonth()];
  context.payYear = payDateObject.getFullYear();
  context.payPeriodStart = resolvedPayPeriodStart;
  context.payPeriodEnd = resolvedPayPeriodEnd;
  context.periodStart = resolvedPayPeriodStart;
  context.periodEnd = resolvedPayPeriodEnd;

  let presentDays = toOptionalNonNegativeNumber(presentDaysOverride, 'presentDays');
  let leaveDays = toOptionalNonNegativeNumber(leaveDaysOverride, 'leaveDays');
  let lossOfPayLeave = toOptionalNonNegativeNumber(lossOfPayLeaveOverride, 'lossOfPayLeave');
  let absentDays;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let weekOffDays = 0;
  let holidayDays = 0;
  let payableDays = 0;

  if (presentDays === undefined || leaveDays === undefined || lossOfPayLeave === undefined) {
    const leaveTypes = await LeaveType.findAll({
      where: { companyId },
      attributes: ['name', 'leaveTypeName', 'isWithoutPay', 'isLeaveWithoutPay'],
      transaction,
    });
    const leaveTypeByName = new Map();
    leaveTypes.forEach((lt) => {
      if (lt.name) leaveTypeByName.set(normalizeText(lt.name), lt);
      if (lt.leaveTypeName) leaveTypeByName.set(normalizeText(lt.leaveTypeName), lt);
    });

    const attendanceRows = await Attendance.findAll({
      where: {
        companyId,
        staffId: employeeSalaryMaster?.staffId,
        attendanceDate: {
          [db.Sequelize.Op.between]: [resolvedPayPeriodStart, resolvedPayPeriodEnd],
        },
      },
      attributes: ['attendanceStatus'],
      transaction,
    });

    let computedPresent = 0;
    let computedLeave = 0;
    let computedAbsent = 0;
    let computedLossOfPayLeave = 0;
    let computedPaidLeaveDays = 0;
    let computedUnpaidLeaveDays = 0;
    let computedWeekOffDays = 0;
    let computedHolidayDays = 0;

    for (const row of attendanceRows) {
      const statusRaw = String(row.attendanceStatus || '').trim();
      const status = normalizeText(statusRaw);
      if (status === 'present') {
        computedPresent += 1;
      } else if (status === 'late' || status === 'early exit' || status === 'permission') {
        computedPresent += 1;
      } else if (status === 'half-day') {
        computedPresent += 0.5;
        computedAbsent += 0.5;
      } else if (status === 'week off') {
        computedWeekOffDays += 1;
      } else if (status === 'holiday') {
        computedHolidayDays += 1;
      } else if (status === 'absent') {
        computedAbsent += 1;
      } else if (status.startsWith('leave')) {
        computedLeave += 1;
        const leaveTypeName = parseLeaveTypeFromStatus(statusRaw);
        const leaveType = leaveTypeByName.get(normalizeText(leaveTypeName || ''));
        const isWithoutPayByType = Boolean(leaveType?.isWithoutPay || leaveType?.isLeaveWithoutPay);
        const isWithoutPayByText = /loss\s*of\s*pay/.test(status) || /\blop\b/.test(status);
        if (isWithoutPayByType || isWithoutPayByText) {
          computedLossOfPayLeave += 1;
          computedUnpaidLeaveDays += 1;
        } else {
          computedPaidLeaveDays += 1;
        }
      }
    }

    if (presentDays === undefined) presentDays = Number(computedPresent.toFixed(2));
    if (leaveDays === undefined) leaveDays = Number(computedLeave.toFixed(2));
    if (lossOfPayLeave === undefined) lossOfPayLeave = Number(computedLossOfPayLeave.toFixed(2));
    absentDays = Number(computedAbsent.toFixed(2));
    paidLeaveDays = Number(computedPaidLeaveDays.toFixed(2));
    unpaidLeaveDays = Number(computedUnpaidLeaveDays.toFixed(2));
    weekOffDays = Number(computedWeekOffDays.toFixed(2));
    holidayDays = Number(computedHolidayDays.toFixed(2));
  }

  context.presentDays = presentDays ?? 0;
  context.leaveDays = leaveDays ?? 0;
  context.lossOfPayLeave = lossOfPayLeave ?? 0;
  context.absentDays = absentDays ?? 0;
  context.paidLeaveDays = paidLeaveDays;
  context.unpaidLeaveDays = unpaidLeaveDays;
  context.weekOffDays = weekOffDays;
  context.holidayDays = holidayDays;
  payableDays = Number(
    (
      Number(context.presentDays || 0) +
      Number(context.paidLeaveDays || 0) +
      Number(context.weekOffDays || 0) +
      Number(context.holidayDays || 0)
    ).toFixed(2)
  );
  context.payableDays = payableDays;
  context.paymentDays = payableDays;
  context.payment_days = payableDays;
  context.payable_days = payableDays;
  context.present = context.presentDays;
  context.holiday = context.holidayDays;
  context.weekoff = context.weekOffDays;
  context.weekOff = context.weekOffDays;
  context.leave = context.leaveDays;
  context.paidLeave = context.paidLeaveDays;
  context.unpaidLeave = context.unpaidLeaveDays;
  context.absent = context.absentDays;
  context.lopLeave = context.lossOfPayLeave;
  context.lopleave = context.lossOfPayLeave;
  context.lossofpayleave = context.lossOfPayLeave;
  context.lop = context.lossOfPayLeave;
  context.lossOfPayDays = context.lossOfPayLeave;
  context.lopDays = context.lossOfPayLeave;

  return context;
};

const syncFormulaComponentsForSalaryMaster = async ({
  companyId,
  employeeSalaryMasterId,
  formulaDate,
  payPeriodStart,
  payPeriodEnd,
  presentDaysOverride,
  leaveDaysOverride,
  lossOfPayLeaveOverride,
  transaction,
}) => {
  const context = await buildFormulaContext({
    companyId,
    employeeSalaryMasterId,
    formulaDate,
    payPeriodStart,
    payPeriodEnd,
    presentDaysOverride,
    leaveDaysOverride,
    lossOfPayLeaveOverride,
    transaction,
  });

  const formulaComponents = await SalaryComponent.findAll({
    where: {
      companyId,
      calculationType: 'Formula',
      status: 'Active',
    },
    order: [
      ['displayOrder', 'ASC'],
      ['name', 'ASC'],
    ],
    transaction,
  });

  const activeFormulaComponentIds = formulaComponents.map((c) => c.salaryComponentId);
  if (activeFormulaComponentIds.length > 0) {
    await EmployeeSalaryComponent.destroy({
      where: {
        employeeSalaryMasterId,
        valueType: 'Formula',
        componentId: { [db.Sequelize.Op.notIn]: activeFormulaComponentIds },
      },
      transaction,
    });
  } else {
    await EmployeeSalaryComponent.destroy({
      where: {
        employeeSalaryMasterId,
        valueType: 'Formula',
      },
      transaction,
    });
  }

  for (const component of formulaComponents) {
    const formula = String(component.formula || '').trim();
    if (!formula) {
      throw new Error(`Formula missing for component "${component.name}"`);
    }

    const evaluation = formulaEvaluator.evaluate(formula, context);
    const calculatedAmount = Math.max(0, toSafeNumber(evaluation));
    const annualAmount = Number((calculatedAmount * 12).toFixed(2));

    setContextValue(context, component.code, calculatedAmount);

    const existingAssignment = await EmployeeSalaryComponent.findOne({
      where: {
        employeeSalaryMasterId,
        componentId: component.salaryComponentId,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    const payload = {
      employeeSalaryMasterId,
      componentId: component.salaryComponentId,
      componentName: component.name,
      componentCode: component.code,
      componentType: component.type,
      valueType: 'Formula',
      fixedAmount: null,
      percentageValue: null,
      percentageBase: null,
      formulaId: null,
      formulaExpression: formula,
      calculatedAmount,
      annualAmount,
      isStatutory: Boolean(component.isStatutory),
      isTaxable: Boolean(component.isTaxable),
      affectsGrossSalary: Boolean(component.affectsGrossSalary),
      affectsNetSalary: Boolean(component.affectsNetSalary),
      displayOrder: component.displayOrder ?? 0,
      remarks: existingAssignment?.remarks || null,
    };

    if (existingAssignment) {
      await existingAssignment.update(payload, { transaction });
    } else {
      await EmployeeSalaryComponent.create(payload, { transaction });
    }
  }

  return context;
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

const ensureActiveSalaryMaster = async ({
  staffId,
  companyId,
  effectiveFrom,
  createdBy,
  updatedBy,
  transaction,
}) => {
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

  return salaryMaster;
};

export const assignEarningComponentToEmployee = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const staffId = parseOptionalInt(req.body.staffId);
    const companyId = parseOptionalInt(req.body.companyId);
    const componentId = parseOptionalInt(req.body.componentId);
    const updatedBy = parseOptionalInt(req.body.updatedBy) || null;
    const createdBy = parseOptionalInt(req.body.createdBy) || updatedBy;
    const effectiveFrom = String(req.body.effectiveFrom || new Date().toISOString().slice(0, 10));
    const formulaDate = String(req.body.formulaDate || effectiveFrom);
    const payPeriodStart = req.body.payPeriodStart ? String(req.body.payPeriodStart) : undefined;
    const payPeriodEnd = req.body.payPeriodEnd ? String(req.body.payPeriodEnd) : undefined;
    const presentDaysOverride = toOptionalNonNegativeNumber(req.body.presentDays, 'presentDays');
    const leaveDaysOverride = toOptionalNonNegativeNumber(req.body.leaveDays, 'leaveDays');
    const lossOfPayLeaveOverride = toOptionalNonNegativeNumber(req.body.lossOfPayLeave, 'lossOfPayLeave');

    if (!staffId || !companyId || !componentId) {
      throw new Error('staffId, companyId and componentId are required');
    }

    const employee = await Employee.findByPk(staffId, {
      include: [{ model: db.Role, as: 'role', required: false }],
      transaction,
    });
    if (!employee) {
      throw new Error('Employee not found');
    }

    if (String(employee.companyId) !== String(companyId)) {
      throw new Error('Employee does not belong to the selected company');
    }

    // Salary assignment is allowed only for Teaching/Non Teaching staff.
    let roleName = employee?.role?.roleName || '';
    if (!roleName) {
      const mappedUser = await User.findOne({
        where: { userNumber: employee.staffNumber },
        include: [{ model: db.Role, as: 'role', attributes: ['roleId', 'roleName'], required: false }],
        transaction,
      });
      roleName = mappedUser?.role?.roleName || '';
    }
    if (!STAFF_ROLE_KEYS.has(normalizeRoleName(roleName))) {
      throw new Error('Salary assignment is allowed only for Teaching Staff and Non Teaching Staff');
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
    const hasFixedAmount =
      req.body.fixedAmount !== null &&
      req.body.fixedAmount !== undefined &&
      String(req.body.fixedAmount).trim() !== '';
    if (salaryComponent.calculationType === 'Fixed' && !hasFixedAmount) {
      throw new Error('fixedAmount is required for fixed earning component');
    }

    const fixedAmount =
      salaryComponent.calculationType === 'Fixed'
        ? toNonNegativeNumber(req.body.fixedAmount, 'fixedAmount')
        : null;

    const salaryMaster = await ensureActiveSalaryMaster({
      staffId,
      companyId,
      effectiveFrom,
      createdBy,
      updatedBy,
      transaction,
    });

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
      valueType: salaryComponent.calculationType === 'Formula' ? 'Formula' : 'Fixed',
      fixedAmount,
      percentageValue: null,
      percentageBase: null,
      formulaId: null,
      formulaExpression: salaryComponent.calculationType === 'Formula' ? salaryComponent.formula : null,
      calculatedAmount: salaryComponent.calculationType === 'Formula' ? 0 : fixedAmount,
      annualAmount: Number(((salaryComponent.calculationType === 'Formula' ? 0 : fixedAmount) * 12).toFixed(2)),
      isStatutory: Boolean(salaryComponent.isStatutory),
      isTaxable: Boolean(salaryComponent.isTaxable),
      affectsGrossSalary: Boolean(salaryComponent.affectsGrossSalary),
      affectsNetSalary: Boolean(salaryComponent.affectsNetSalary),
      displayOrder: salaryComponent.displayOrder ?? 0,
      remarks: (() => {
        const previous = parseJsonObject(assignment?.remarks);
        const requestedBasis = String(req.body.amountBasis || previous.amountBasis || 'monthly').trim().toLowerCase();
        const amountBasis = requestedBasis === 'daily' ? 'daily' : 'monthly';
        const note = String(req.body.remarks || previous.note || '').trim();
        return JSON.stringify({
          ...previous,
          amountBasis,
          note: note || undefined,
        });
      })(),
    };

    if (assignment) {
      await assignment.update(assignmentPayload, { transaction });
    } else {
      assignment = await EmployeeSalaryComponent.create(assignmentPayload, { transaction });
    }

    await syncFormulaComponentsForSalaryMaster({
      companyId,
      employeeSalaryMasterId: salaryMaster.employeeSalaryMasterId,
      formulaDate,
      payPeriodStart,
      payPeriodEnd,
      presentDaysOverride,
      leaveDaysOverride,
      lossOfPayLeaveOverride,
      transaction,
    });

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

export const syncFormulaComponentsForEmployee = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const staffId = parseOptionalInt(req.body.staffId);
    const companyId = parseOptionalInt(req.body.companyId);
    const updatedBy = parseOptionalInt(req.body.updatedBy) || null;
    const createdBy = parseOptionalInt(req.body.createdBy) || updatedBy;
    const effectiveFrom = String(req.body.effectiveFrom || new Date().toISOString().slice(0, 10));
    const formulaDate = String(req.body.formulaDate || effectiveFrom);
    const defaultMonthRange = buildMonthRange(formulaDate);
    const payPeriodStart = req.body.payPeriodStart ? String(req.body.payPeriodStart) : defaultMonthRange.start;
    const payPeriodEnd = req.body.payPeriodEnd ? String(req.body.payPeriodEnd) : defaultMonthRange.end;
    const presentDaysOverride = toOptionalNonNegativeNumber(req.body.presentDays, 'presentDays');
    const leaveDaysOverride = toOptionalNonNegativeNumber(req.body.leaveDays, 'leaveDays');
    const lossOfPayLeaveOverride = toOptionalNonNegativeNumber(req.body.lossOfPayLeave, 'lossOfPayLeave');

    if (!staffId || !companyId) {
      throw new Error('staffId and companyId are required');
    }

    const employee = await Employee.findByPk(staffId, {
      include: [{ model: db.Role, as: 'role', required: false }],
      transaction,
    });
    if (!employee) {
      throw new Error('Employee not found');
    }
    if (String(employee.companyId) !== String(companyId)) {
      throw new Error('Employee does not belong to the selected company');
    }

    const salaryMaster = await ensureActiveSalaryMaster({
      staffId,
      companyId,
      effectiveFrom,
      createdBy,
      updatedBy,
      transaction,
    });

    const formulaContext = await syncFormulaComponentsForSalaryMaster({
      companyId,
      employeeSalaryMasterId: salaryMaster.employeeSalaryMasterId,
      formulaDate,
      payPeriodStart,
      payPeriodEnd,
      presentDaysOverride,
      leaveDaysOverride,
      lossOfPayLeaveOverride,
      transaction,
    });

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
      message: 'Formula components synced successfully',
      salaryMaster: updatedSalaryMaster,
      totals,
      formulaContext,
    });
  } catch (error) {
    await transaction.rollback();
    res.status(400).json({ error: error.message });
  }
};
