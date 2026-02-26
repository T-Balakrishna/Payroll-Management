import ExcelJS from 'exceljs';
import formulaEvaluator from './formulaEvaluator.js';
import db from '../models/index.js';

const {
  SalaryGeneration,
  SalaryGenerationDetail,
  Employee,
  EmployeeSalaryMaster,
  EmployeeSalaryComponent,
  SalaryComponent,
  Attendance,
  LeaveType,
} = db;

const toInt = (value) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) ? parsed : null;
};

const toDateOnly = (value) => {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
};

const buildMonthRange = (year, month) => {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return {
    start: toDateOnly(start),
    end: toDateOnly(end),
    daysInMonth: end.getUTCDate(),
  };
};

const isPastMonth = (year, month) => {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  return year < currentYear || (year === currentYear && month < currentMonth);
};

const parseLeaveTypeFromStatus = (status = '') => {
  const text = String(status || '').trim();
  if (!/^leave\s*-/i.test(text)) return null;
  return text.replace(/^leave\s*-\s*/i, '').trim();
};

const normalize = (value = '') => String(value || '').trim().toLowerCase();

const parseRemarksJson = (remarks) => {
  if (!remarks) return {};
  try {
    const parsed = JSON.parse(String(remarks));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
};

const parseComponentRemarks = (remarks) => {
  if (!remarks) return {};
  try {
    const parsed = JSON.parse(String(remarks));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
};

const STANDARD_MONTH_DAYS = 30;
const toSafeNumber = (value) => {
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
};
const setFormulaContextValue = (context, key, value) => {
  const normalizedKey = String(key || '').trim();
  if (!normalizedKey) return;
  context[normalizedKey] = value;
  context[normalizedKey.toUpperCase()] = value;
  context[normalizedKey.toLowerCase()] = value;
};

const buildAttendanceSummary = ({ attendanceRows, leaveTypeByName, daysInMonth }) => {
  let presentDays = 0;
  let absentDays = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let weekOffDays = 0;
  let holidayDays = 0;

  const paidLeaveTypeBreakdown = {};
  const unpaidLeaveTypeBreakdown = {};

  for (const row of attendanceRows) {
    const status = normalize(row.attendanceStatus);

    if (status === 'present' || status === 'late' || status === 'early exit' || status === 'permission') {
      presentDays += 1;
      continue;
    }
    if (status === 'half-day') {
      presentDays += 0.5;
      absentDays += 0.5;
      continue;
    }
    if (status === 'week off') {
      weekOffDays += 1;
      continue;
    }
    if (status === 'holiday') {
      holidayDays += 1;
      continue;
    }
    if (status === 'absent' || status.includes('absent')) {
      absentDays += 1;
      continue;
    }

    const leaveTypeName = parseLeaveTypeFromStatus(row.attendanceStatus);
    if (leaveTypeName) {
      const leaveType = leaveTypeByName.get(normalize(leaveTypeName));
      const isWithoutPay = Boolean(leaveType?.isWithoutPay || leaveType?.isLeaveWithoutPay);
      if (isWithoutPay) {
        unpaidLeaveDays += 1;
        unpaidLeaveTypeBreakdown[leaveTypeName] = Number(unpaidLeaveTypeBreakdown[leaveTypeName] || 0) + 1;
      } else {
        paidLeaveDays += 1;
        paidLeaveTypeBreakdown[leaveTypeName] = Number(paidLeaveTypeBreakdown[leaveTypeName] || 0) + 1;
      }
    }
  }

  // If attendance is not marked for some dates, treat them as absent (LOP) days.
  // This prevents full-month salary when only a few days are present.
  const countedDays = presentDays + absentDays + paidLeaveDays + unpaidLeaveDays + weekOffDays + holidayDays;
  if (Number.isFinite(daysInMonth) && daysInMonth > countedDays) {
    absentDays += daysInMonth - countedDays;
  }

  return {
    presentDays: Number(presentDays.toFixed(2)),
    absentDays: Number(absentDays.toFixed(2)),
    paidLeaveDays: Number(paidLeaveDays.toFixed(2)),
    unpaidLeaveDays: Number(unpaidLeaveDays.toFixed(2)),
    weekOffDays: Number(weekOffDays.toFixed(2)),
    holidayDays: Number(holidayDays.toFixed(2)),
    paidLeaveTypeBreakdown,
    unpaidLeaveTypeBreakdown,
  };
};

const toPlainWithMeta = (record) => {
  const plain = record.toJSON();
  const meta = parseRemarksJson(plain.remarks);
  return {
    ...plain,
    paidLeaveTypeBreakdown: meta.paidLeaveTypeBreakdown || {},
    unpaidLeaveTypeBreakdown: meta.unpaidLeaveTypeBreakdown || {},
  };
};


export const getAllSalaryGenerations = async (req, res) => {
  try {
    const where = {};
    const companyId = toInt(req.query.companyId);
    const staffId = toInt(req.query.staffId);
    const salaryMonth = toInt(req.query.salaryMonth);
    const salaryYear = toInt(req.query.salaryYear);
    const status = String(req.query.status || '').trim();

    if (companyId) where.companyId = companyId;
    if (staffId) where.staffId = staffId;
    if (salaryMonth) where.salaryMonth = salaryMonth;
    if (salaryYear) where.salaryYear = salaryYear;
    if (status) where.status = status;

    const salaryGenerations = await SalaryGeneration.findAll({
      where,
      include: [
        { model: db.Employee, as: 'employee' },
        { model: db.EmployeeSalaryMaster, as: 'employeeSalaryMaster' },
        { model: db.Company, as: 'company' },
        { model: db.User, as: 'generator' },
        { model: db.User, as: 'approver' },
        { model: db.User, as: 'payer' },
      ],
      order: [
        ['salaryYear', 'DESC'],
        ['salaryMonth', 'DESC'],
        ['salaryGenerationId', 'DESC'],
      ],
    });
    res.json(salaryGenerations.map(toPlainWithMeta));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getSalaryGenerationById = async (req, res) => {
  try {
    const salaryGeneration = await SalaryGeneration.findByPk(req.params.id, {
      include: [
        { model: db.Employee, as: 'employee' },
        { model: db.EmployeeSalaryMaster, as: 'employeeSalaryMaster' },
        { model: db.Company, as: 'company' },
        { model: db.User, as: 'generator' },
        { model: db.User, as: 'approver' },
        { model: db.User, as: 'payer' },
        { model: db.SalaryGenerationDetail, as: 'salaryGenerationDetails' },
      ],
      order: [[{ model: db.SalaryGenerationDetail, as: 'salaryGenerationDetails' }, 'componentName', 'ASC']],
    });

    if (!salaryGeneration) {
      return res.status(404).json({ message: 'Salary generation not found' });
    }

    res.json(toPlainWithMeta(salaryGeneration));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const generateMonthlySalary = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const companyId = toInt(req.body.companyId);
    const salaryMonth = toInt(req.body.salaryMonth);
    const salaryYear = toInt(req.body.salaryYear);
    const generatedBy = toInt(req.body.generatedBy);

    if (!companyId || !salaryMonth || !salaryYear) {
      throw new Error('companyId, salaryMonth and salaryYear are required');
    }
    if (salaryMonth < 1 || salaryMonth > 12) {
      throw new Error('salaryMonth must be between 1 and 12');
    }
    if (!isPastMonth(salaryYear, salaryMonth)) {
      throw new Error('Salary can be generated only for previous months');
    }

    const { start, end, daysInMonth } = buildMonthRange(salaryYear, salaryMonth);
    const leaveTypes = await LeaveType.findAll({ where: { companyId }, transaction });
    const activeComponentCodes = await SalaryComponent.findAll({
      where: { companyId, status: 'Active' },
      attributes: ['code'],
      transaction,
    });
    formulaEvaluator.setAllowedComponents(activeComponentCodes.map((c) => c.code));
    const leaveTypeByName = new Map();
    leaveTypes.forEach((lt) => {
      if (lt.name) leaveTypeByName.set(normalize(lt.name), lt);
      if (lt.leaveTypeName) leaveTypeByName.set(normalize(lt.leaveTypeName), lt);
    });

    const activeSalaryMasters = await EmployeeSalaryMaster.findAll({
      where: {
        companyId,
        status: 'Active',
      },
      include: [{
        model: Employee,
        as: 'employees',
        required: true,
        where: { status: 'Active' },
        include: [
          { model: db.Designation, as: 'designation', required: false },
          { model: db.Department, as: 'department', required: false },
          { model: db.Role, as: 'role', required: false },
        ],
      }],
      transaction,
    });

    if (!activeSalaryMasters.length) {
      throw new Error('No active employee salary masters found for this company');
    }

    const targetEmployees = activeSalaryMasters
      .map((master) => master.employees)
      .filter(Boolean);
    const staffIds = targetEmployees.map((emp) => emp.staffId);
    const attendanceRows = await Attendance.findAll({
      where: {
        companyId,
        staffId: { [db.Sequelize.Op.in]: staffIds },
        attendanceDate: { [db.Sequelize.Op.between]: [start, end] },
      },
      attributes: ['staffId', 'attendanceDate', 'attendanceStatus'],
      transaction,
    });

    const attendanceByStaff = new Map();
    for (const row of attendanceRows) {
      const key = String(row.staffId);
      if (!attendanceByStaff.has(key)) attendanceByStaff.set(key, []);
      attendanceByStaff.get(key).push(row);
    }

    const absentEmployees = [];
    for (const emp of targetEmployees) {
      const rows = attendanceByStaff.get(String(emp.staffId)) || [];
      const hasAbsent = rows.some((r) => normalize(r.attendanceStatus).includes('absent'));
      if (hasAbsent) {
        absentEmployees.push({
          staffId: emp.staffId,
          staffNumber: emp?.staffNumber || '',
          employeeName: `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim(),
        });
      }
    }

    if (absentEmployees.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Salary generation blocked: absent attendance found. Update attendance and retry.',
        absentEmployees,
      });
    }

    const generatedRecords = [];

    for (const salaryMaster of activeSalaryMasters) {
      const staffId = salaryMaster.staffId;
      const employeeName = `${salaryMaster?.employees?.firstName || ''} ${salaryMaster?.employees?.lastName || ''}`.trim();
      const staffNumber = salaryMaster?.employees?.staffNumber || staffId;
      const empAttendanceRows = attendanceByStaff.get(String(staffId)) || [];
      const summary = buildAttendanceSummary({ attendanceRows: empAttendanceRows, leaveTypeByName, daysInMonth });
      const lossOfPayDays = Number((summary.absentDays + summary.unpaidLeaveDays).toFixed(2));
      const payableDays = Number(Math.max(0, daysInMonth - lossOfPayDays).toFixed(2));
      const monthlyPayableFactor = Number((payableDays / STANDARD_MONTH_DAYS).toFixed(6));
      const formulaContext = {};
      activeComponentCodes.forEach((component) => setFormulaContextValue(formulaContext, component.code, 0));
      formulaContext.designation = salaryMaster?.employees?.designation?.designationName || '';
      formulaContext.designationLower = String(formulaContext.designation || '').trim().toLowerCase();
      formulaContext.department = salaryMaster?.employees?.department?.departmentName || '';
      formulaContext.role = salaryMaster?.employees?.role?.roleName || '';
      formulaContext.roleLower = String(formulaContext.role || '').trim().toLowerCase();
      formulaContext.present = Number(summary.presentDays || 0);
      formulaContext.presentDays = Number(summary.presentDays || 0);
      formulaContext.holiday = Number(summary.holidayDays || 0);
      formulaContext.holidayDays = Number(summary.holidayDays || 0);
      formulaContext.weekoff = Number(summary.weekOffDays || 0);
      formulaContext.weekOff = Number(summary.weekOffDays || 0);
      formulaContext.weekOffDays = Number(summary.weekOffDays || 0);
      formulaContext.leave = Number((summary.paidLeaveDays + summary.unpaidLeaveDays).toFixed(2));
      formulaContext.leaveDays = formulaContext.leave;
      formulaContext.paidLeave = Number(summary.paidLeaveDays || 0);
      formulaContext.paidLeaveDays = Number(summary.paidLeaveDays || 0);
      formulaContext.unpaidLeave = Number(summary.unpaidLeaveDays || 0);
      formulaContext.unpaidLeaveDays = Number(summary.unpaidLeaveDays || 0);
      formulaContext.absent = Number(summary.absentDays || 0);
      formulaContext.absentDays = Number(summary.absentDays || 0);
      formulaContext.lossOfPayLeave = Number(summary.unpaidLeaveDays || 0);
      formulaContext.lop = Number(summary.unpaidLeaveDays || 0);
      formulaContext.lopDays = Number(summary.unpaidLeaveDays || 0);
      formulaContext.payableDays = Number(payableDays || 0);
      formulaContext.payable_days = Number(payableDays || 0);
      formulaContext.paymentDays = Number(payableDays || 0);
      formulaContext.payment_days = Number(payableDays || 0);
      formulaContext.payMonth = salaryMonth;
      formulaContext.payYear = salaryYear;
      formulaContext.payPeriodStart = start;
      formulaContext.payPeriodEnd = end;
      formulaContext.payDate = end;

      const components = await EmployeeSalaryComponent.findAll({
        where: { employeeSalaryMasterId: salaryMaster.employeeSalaryMasterId },
        order: [['displayOrder', 'ASC']],
        transaction,
      });

      let totalEarnings = 0;
      let totalDeductions = 0;
      const detailRows = [];
      const deductionCandidates = [];
      const componentLogs = [];
      for (const c of components) {
        const baseAmount = Number(c.calculatedAmount || 0);
        const isEarning = c.componentType === 'Earning';
        const remarksMeta = parseComponentRemarks(c.remarks);
        const amountBasis = String(remarksMeta.amountBasis || 'monthly').trim().toLowerCase();

        if (isEarning) {
          let calculatedAmount = Number(baseAmount.toFixed(2));
          let isProrated = false;

          if (c.valueType === 'Formula' && c.formulaExpression) {
            const evaluation = formulaEvaluator.evaluate(String(c.formulaExpression), formulaContext);
            calculatedAmount = Number(Math.max(0, toSafeNumber(evaluation)).toFixed(2));
            isProrated = false;
          } else {
            if (amountBasis === 'daily') {
              calculatedAmount = Number((baseAmount * payableDays).toFixed(2));
              isProrated = true;
            } else {
              calculatedAmount = Number((baseAmount * monthlyPayableFactor).toFixed(2));
              isProrated = true;
            }
          }
          const perDayAmount = amountBasis === 'daily'
            ? baseAmount
            : Number((baseAmount / STANDARD_MONTH_DAYS).toFixed(2));

          totalEarnings += calculatedAmount;
          setFormulaContextValue(formulaContext, c.componentCode, calculatedAmount);
          componentLogs.push({
            componentType: 'EARNING',
            componentCode: c.componentCode || '',
            componentName: c.componentName,
            amountBasis,
            monthlyAssignedAmount: baseAmount,
            perDayAmount,
            payableDays,
            calculatedAmount,
          });
          detailRows.push({
            componentId: c.componentId,
            componentName: c.componentName,
            componentType: c.componentType,
            calculationType: c.valueType === 'Percentage' ? 'Percentage' : c.valueType,
            baseAmount,
            calculatedAmount,
            isProrated,
            proratedAmount: isProrated ? calculatedAmount : null,
            formula: c.formulaExpression || null,
            remarks: amountBasis === 'daily'
              ? 'Daily basis component'
              : 'Monthly basis component prorated as monthly/30 * payableDays',
            createdBy: generatedBy || null,
            updatedBy: generatedBy || null,
          });
        } else {
          deductionCandidates.push(c);
        }
      }

      const grossSalary = Number(totalEarnings.toFixed(2));

      for (const c of deductionCandidates) {
        const baseAmount = Number(c.calculatedAmount || 0);
        const remarksMeta = parseComponentRemarks(c.remarks);
        const amountBasis = String(remarksMeta.amountBasis || 'monthly').trim().toLowerCase();
        const calculatedAmount = c.valueType === 'Formula' && c.formulaExpression
          ? Number(Math.max(0, toSafeNumber(formulaEvaluator.evaluate(String(c.formulaExpression), formulaContext))).toFixed(2))
          : amountBasis === 'daily'
            ? Number((baseAmount * payableDays).toFixed(2))
            : Number((baseAmount * monthlyPayableFactor).toFixed(2));
        const perDayAmount = amountBasis === 'daily'
          ? baseAmount
          : Number((baseAmount / STANDARD_MONTH_DAYS).toFixed(2));
        totalDeductions += calculatedAmount;
        componentLogs.push({
          componentType: 'DEDUCTION',
          componentCode: c.componentCode || '',
          componentName: c.componentName,
          amountBasis,
          monthlyAssignedAmount: baseAmount,
          perDayAmount,
          payableDays,
          calculatedAmount,
        });

        detailRows.push({
          componentId: c.componentId,
          componentName: c.componentName,
          componentType: c.componentType,
          calculationType: c.valueType === 'Percentage' ? 'Percentage' : c.valueType,
          baseAmount,
          calculatedAmount,
          isProrated: amountBasis === 'daily' || payableDays !== daysInMonth,
          proratedAmount: calculatedAmount,
          formula: c.formulaExpression || null,
          remarks: amountBasis === 'daily'
            ? 'Daily basis deduction prorated by payable days'
            : 'Monthly deduction prorated as monthly/30 * payableDays',
          createdBy: generatedBy || null,
          updatedBy: generatedBy || null,
        });
      }

      const netSalary = Number((grossSalary - totalDeductions).toFixed(2));
      const basicComponent = components.find((c) => normalize(c.componentCode) === 'basic');
      let basicSalary = Number(basicComponent?.calculatedAmount || 0);
      if (basicComponent) {
        const basicMeta = parseComponentRemarks(basicComponent.remarks);
        const basicBasis = String(basicMeta.amountBasis || 'monthly').trim().toLowerCase();
        if (basicBasis === 'daily') {
          basicSalary = Number((basicSalary * payableDays).toFixed(2));
        } else {
          basicSalary = Number((basicSalary * monthlyPayableFactor).toFixed(2));
        }
      } else {
        basicSalary = 0;
      }

      const remarksJson = JSON.stringify({
        paidLeaveTypeBreakdown: summary.paidLeaveTypeBreakdown,
        unpaidLeaveTypeBreakdown: summary.unpaidLeaveTypeBreakdown,
      });

      const recordPayload = {
        staffId,
        employeeSalaryMasterId: salaryMaster.employeeSalaryMasterId,
        companyId,
        salaryMonth,
        salaryYear,
        payPeriodStart: start,
        payPeriodEnd: end,
        workingDays: daysInMonth,
        presentDays: summary.presentDays,
        absentDays: summary.absentDays,
        paidLeaveDays: summary.paidLeaveDays,
        unpaidLeaveDays: summary.unpaidLeaveDays,
        holidayDays: summary.holidayDays,
        weekOffDays: summary.weekOffDays,
        overtimeHours: 0,
        lateCount: 0,
        earlyExitCount: 0,
        basicSalary,
        totalEarnings: grossSalary,
        totalDeductions: Number(totalDeductions.toFixed(2)),
        grossSalary,
        netSalary,
        overtimePay: 0,
        lateDeduction: 0,
        absentDeduction: 0,
        leaveDeduction: 0,
        bonus: 0,
        remarks: remarksJson,
        status: 'Generated',
        generatedBy: generatedBy || null,
      };

      let record = await SalaryGeneration.findOne({
        where: { staffId, salaryMonth, salaryYear },
        paranoid: false,
        transaction,
      });

      if (record) {
        if (record.deletedAt) {
          await record.restore({ transaction });
        }
        await record.update(
          { ...recordPayload, generatedBy: generatedBy || record.generatedBy || null },
          { transaction }
        );
      } else {
        record = await SalaryGeneration.create(recordPayload, { transaction });
      }

      await SalaryGenerationDetail.destroy({
        where: { salaryGenerationId: record.salaryGenerationId },
        force: true,
        transaction,
      });

      if (detailRows.length > 0) {
        const uniqueDetailRows = [];
        const seenComponentIds = new Set();
        for (const row of detailRows) {
          const key = String(row.componentId);
          if (seenComponentIds.has(key)) continue;
          seenComponentIds.add(key);
          uniqueDetailRows.push(row);
        }

        await SalaryGenerationDetail.bulkCreate(
          uniqueDetailRows.map((row) => ({
            ...row,
            salaryGenerationId: record.salaryGenerationId,
            companyId,
          })),
          { transaction }
        );
      }

      const reloaded = await SalaryGeneration.findByPk(record.salaryGenerationId, {
        include: [{ model: Employee, as: 'employee' }],
        transaction,
      });
      generatedRecords.push(toPlainWithMeta(reloaded));
    }

    await transaction.commit();
    return res.status(200).json({
      message: 'Salary generated successfully',
      salaryMonth,
      salaryYear,
      generatedCount: generatedRecords.length,
      records: generatedRecords,
    });
  } catch (error) {
    await transaction.rollback();
    const validationDetails = Array.isArray(error?.errors)
      ? error.errors.map((e) => `${e.path}: ${e.message}`)
      : [];
    return res.status(400).json({
      error: error.message || 'Salary generation failed',
      details: validationDetails,
    });
  }
};

export const downloadSalaryGenerationSpreadsheet = async (req, res) => {
  try {
    const companyId = toInt(req.query.companyId);
    const salaryMonth = toInt(req.query.salaryMonth);
    const salaryYear = toInt(req.query.salaryYear);

    if (!companyId || !salaryMonth || !salaryYear) {
      return res.status(400).json({ error: 'companyId, salaryMonth and salaryYear are required' });
    }

    const records = await SalaryGeneration.findAll({
      where: { companyId, salaryMonth, salaryYear },
      include: [
        { model: Employee, as: 'employee' },
        { model: db.Company, as: 'company' },
      ],
      order: [[{ model: Employee, as: 'employee' }, 'staffNumber', 'ASC']],
    });

    if (!records.length) {
      return res.status(404).json({ message: 'No salary generation records found for the selected month' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Salary Generation');

    worksheet.columns = [
      { header: 'Staff Number', key: 'staffNumber', width: 16 },
      { header: 'Employee Name', key: 'employeeName', width: 26 },
      { header: 'Pay Period Start', key: 'payPeriodStart', width: 14 },
      { header: 'Pay Period End', key: 'payPeriodEnd', width: 14 },
      { header: 'Working Days', key: 'workingDays', width: 12 },
      { header: 'Present Days', key: 'presentDays', width: 12 },
      { header: 'Week Off Days', key: 'weekOffDays', width: 12 },
      { header: 'Holiday Days', key: 'holidayDays', width: 12 },
      { header: 'Paid Leave Days', key: 'paidLeaveDays', width: 12 },
      { header: 'Paid Leave Types', key: 'paidLeaveTypes', width: 30 },
      { header: 'Unpaid Leave Days', key: 'unpaidLeaveDays', width: 14 },
      { header: 'Basic Salary', key: 'basicSalary', width: 14 },
      { header: 'Total Earnings', key: 'totalEarnings', width: 14 },
      { header: 'Total Deductions', key: 'totalDeductions', width: 14 },
      { header: 'Gross Salary', key: 'grossSalary', width: 14 },
      { header: 'Net Salary', key: 'netSalary', width: 14 },
      { header: 'Status', key: 'status', width: 12 },
    ];

    records.forEach((record) => {
      const meta = parseRemarksJson(record.remarks);
      const paidLeaveTypeBreakdown = meta.paidLeaveTypeBreakdown || {};
      const paidLeaveTypes = Object.entries(paidLeaveTypeBreakdown)
        .map(([name, count]) => `${name}: ${count}`)
        .join(', ');

      worksheet.addRow({
        staffNumber: record.employee?.staffNumber || record.staffId,
        employeeName: `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.trim(),
        payPeriodStart: record.payPeriodStart,
        payPeriodEnd: record.payPeriodEnd,
        workingDays: Number(record.workingDays || 0),
        presentDays: Number(record.presentDays || 0),
        weekOffDays: Number(record.weekOffDays || 0),
        holidayDays: Number(record.holidayDays || 0),
        paidLeaveDays: Number(record.paidLeaveDays || 0),
        paidLeaveTypes: paidLeaveTypes || '-',
        unpaidLeaveDays: Number(record.unpaidLeaveDays || 0),
        basicSalary: Number(record.basicSalary || 0),
        totalEarnings: Number(record.totalEarnings || 0),
        totalDeductions: Number(record.totalDeductions || 0),
        grossSalary: Number(record.grossSalary || 0),
        netSalary: Number(record.netSalary || 0),
        status: record.status || '',
      });
    });

    worksheet.getRow(1).font = { bold: true };

    for (let i = 12; i <= 16; i += 1) {
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) row.getCell(i).numFmt = '0.00';
      });
    }

    const fileName = `salary-generation-${salaryYear}-${String(salaryMonth).padStart(2, '0')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createSalaryGeneration = async (req, res) => {
  try {
    const salaryGeneration = await SalaryGeneration.create(req.body);
    res.status(201).json(salaryGeneration);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateSalaryGeneration = async (req, res) => {
  try {
    const [updated] = await SalaryGeneration.update(req.body, {
      where: { salaryGenerationId: req.params.id },
    });

    if (!updated) {
      return res.status(404).json({ message: 'Salary generation not found' });
    }

    const salaryGeneration = await SalaryGeneration.findByPk(req.params.id);
    res.json(salaryGeneration);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteSalaryGeneration = async (req, res) => {
  try {
    const deleted = await SalaryGeneration.destroy({
      where: { salaryGenerationId: req.params.id },
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Salary generation not found' });
    }

    res.json({ message: 'Salary generation deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
