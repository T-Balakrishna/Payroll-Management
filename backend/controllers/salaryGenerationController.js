import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { readFile } from 'fs/promises';
import formulaEvaluator from './formulaEvaluator.js';
import db from '../models/index.js';
import { sendMail } from '../services/mailService.js';

const {
  SalaryGeneration,
  SalaryGenerationDetail,
  Employee,
  EmployeeSalaryMaster,
  EmployeeSalaryComponent,
  SalaryComponent,
  Attendance,
  LeaveType,
  Company,
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

const daysBetweenInclusive = (startDateOnly, endDateOnly) => {
  const start = new Date(`${startDateOnly}T00:00:00Z`);
  const end = new Date(`${endDateOnly}T00:00:00Z`);
  const millis = end.getTime() - start.getTime();
  return Math.floor(millis / 86400000) + 1;
};

const getMonthsInRange = (startDateOnly, endDateOnly) => {
  const start = new Date(`${startDateOnly}T00:00:00Z`);
  const end = new Date(`${endDateOnly}T00:00:00Z`);
  const seen = new Set();
  const months = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const finish = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  while (cursor <= finish) {
    const month = cursor.getUTCMonth() + 1;
    const year = cursor.getUTCFullYear();
    const key = `${year}-${String(month).padStart(2, '0')}`;
    if (!seen.has(key)) {
      seen.add(key);
      months.push({ year, month, key });
    }
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
};

const isProfessionalTaxComponent = (component = {}) => {
  const code = normalize(component?.componentCode || component?.code || '');
  const name = normalize(component?.componentName || component?.name || '');
  return code === 'pt' ||
    code === 'ptax' ||
    code === 'professional_tax' ||
    code === 'professionaltax' ||
    name === 'professional tax';
};

const calculateProfessionalTaxDeduction = (sixMonthGrossAverage, appliesForPeriod) => {
  if (!appliesForPeriod) return 0;
  const gross = Number.isFinite(sixMonthGrossAverage) ? sixMonthGrossAverage : 0;
  if (gross <= 20000) return 0;
  if (gross <= 30000) return 135;
  if (gross <= 45000) return 315;
  if (gross <= 60000) return 690;
  if (gross <= 75000) return 1025;
  return 1250;
};

const isPastMonth = (year, month) => {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  return year < currentYear || (year === currentYear && month < currentMonth);
};

const isPastOrTodayRange = (endDateOnly) => {
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const endUtc = new Date(`${endDateOnly}T00:00:00Z`);
  return endUtc < todayUtc;
};

const resolvePayPeriod = ({ salaryMonth, salaryYear, fromDate, toDate, strictPastMonth = true }) => {
  const parsedFrom = fromDate ? toDateOnly(fromDate) : null;
  const parsedTo = toDate ? toDateOnly(toDate) : null;

  if (parsedFrom || parsedTo) {
    if (!parsedFrom || !parsedTo) {
      throw new Error('Both fromDate and toDate are required');
    }
    if (parsedFrom > parsedTo) {
      throw new Error('fromDate must be before or equal to toDate');
    }

    if (strictPastMonth && !isPastOrTodayRange(parsedTo)) {
      throw new Error('Salary can be generated only for completed date ranges');
    }

    return {
      start: parsedFrom,
      end: parsedTo,
      salaryMonth: Number.parseInt(parsedFrom.slice(5, 7), 10),
      salaryYear: Number.parseInt(parsedFrom.slice(0, 4), 10),
      daysInPeriod: daysBetweenInclusive(parsedFrom, parsedTo),
      source: 'range',
    };
  }

  if (!salaryMonth || !salaryYear) {
    throw new Error('Either fromDate/toDate or salaryMonth/salaryYear is required');
  }

  if (salaryMonth < 1 || salaryMonth > 12) {
    throw new Error('salaryMonth must be between 1 and 12');
  }

  if (strictPastMonth && !isPastMonth(salaryYear, salaryMonth)) {
    throw new Error('Salary can be generated only for previous months');
  }

  const { start, end, daysInMonth } = buildMonthRange(salaryYear, salaryMonth);
  return {
    start,
    end,
    salaryMonth,
    salaryYear,
    daysInPeriod: daysInMonth,
    source: 'month',
  };
};

const parseLeaveTypeFromStatus = (status = '') => {
  const text = String(status || '').trim();
  if (!/^leave\s*-/i.test(text)) return null;
  return text.replace(/^leave\s*-\s*/i, '').trim();
};

const normalize = (value = '') => String(value || '').trim().toLowerCase();
const toFileSafeToken = (value = '') => String(value || '')
  .trim()
  .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
  .replace(/\s+/g, '_')
  .replace(/_+/g, '_')
  .replace(/^_+|_+$/g, '');
const formatCurrencyINR = (value) => `₹ ${Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;
const formatDateDDMMYYYY = (value) => {
  const dateText = String(value || '').trim();
  if (!dateText) return '-';
  const parts = dateText.split('-');
  if (parts.length !== 3) return dateText;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
};
const NUMBER_WORDS_SMALL = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const NUMBER_WORDS_TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const numberToWords = (num) => {
  const n = Number.parseInt(String(num), 10);
  if (!Number.isFinite(n) || n < 0) return 'Zero';
  if (n < 20) return NUMBER_WORDS_SMALL[n];
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const rem = n % 10;
    return `${NUMBER_WORDS_TENS[tens]}${rem ? ` ${NUMBER_WORDS_SMALL[rem]}` : ''}`;
  }
  if (n < 1000) {
    const hundreds = Math.floor(n / 100);
    const rem = n % 100;
    return `${NUMBER_WORDS_SMALL[hundreds]} Hundred${rem ? ` ${numberToWords(rem)}` : ''}`;
  }
  if (n < 100000) {
    const thousands = Math.floor(n / 1000);
    const rem = n % 1000;
    return `${numberToWords(thousands)} Thousand${rem ? ` ${numberToWords(rem)}` : ''}`;
  }
  if (n < 10000000) {
    const lakhs = Math.floor(n / 100000);
    const rem = n % 100000;
    return `${numberToWords(lakhs)} Lakh${rem ? ` ${numberToWords(rem)}` : ''}`;
  }
  const crores = Math.floor(n / 10000000);
  const rem = n % 10000000;
  return `${numberToWords(crores)} Crore${rem ? ` ${numberToWords(rem)}` : ''}`;
};
const amountToWordsINR = (amount) => {
  const rounded = Math.round(Number(amount || 0));
  return `INR ${numberToWords(rounded)} only.`;
};

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

const pickRecipientEmail = (employee) => {
  const official = String(employee?.officialEmail || '').trim();
  if (official) return official;
  const personal = String(employee?.personalEmail || '').trim();
  if (personal) return personal;
  return null;
};

const createSalarySlipPdfBuffer = async ({ record, periodStart, periodEnd }) => {
  const employeeName = `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.trim() || 'Employee';
  const staffNumber = String(record.employee?.staffNumber || record.staffId || '').trim() || 'Staff';
  const safeEmployeeName = toFileSafeToken(employeeName) || 'Employee';
  const safeStaffNumber = toFileSafeToken(staffNumber) || 'Staff';
  const fileName = `${safeEmployeeName}_${safeStaffNumber}.pdf`;

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks = [];
  const bufferPromise = new Promise((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const allDetails = Array.isArray(record.salaryGenerationDetails) ? record.salaryGenerationDetails : [];
  const earnings = allDetails
    .filter((item) => String(item.componentType || '').toLowerCase() === 'earning')
    .sort((a, b) => String(a.componentName || '').localeCompare(String(b.componentName || '')));
  const deductions = allDetails
    .filter((item) => String(item.componentType || '').toLowerCase() === 'deduction')
    .sort((a, b) => String(a.componentName || '').localeCompare(String(b.componentName || '')));
  const startDate = record.payPeriodStart || periodStart;
  const endDate = record.payPeriodEnd || periodEnd;
  const workingDays = Number(record.workingDays || (
    startDate && endDate ? daysBetweenInclusive(startDate, endDate) : 0
  ));
  const leaveWithoutPay = Number(record.unpaidLeaveDays || 0);
  const absentDays = Number(record.absentDays || 0);
  const paymentDays = Math.max(0, Number((workingDays - leaveWithoutPay - absentDays).toFixed(2)));
  const companyName = String(record.company?.companyName || 'NATIONAL ENGINEERING COLLEGE').trim();
  const deptName = record.employee?.department?.departmentName || '-';
  const designationName = record.employee?.designation?.designationName || '-';
  const bankAccountNo = record.employee?.bankAccountNumber || '-';
  const salarySlipNo = `SAL SLIP/XXXXXXXXXX/${String(record.salaryGenerationId).padStart(5, '0')}`;

  const loadLogoBuffer = async () => {
    try {
      const localLogoUrl = new URL('../../frontend/src/assets/neclogo.png', import.meta.url);
      return await readFile(localLogoUrl);
    } catch (error) {
      return null;
    }
  };
  const logoBuffer = await loadLogoBuffer();

  const blue = '#1f3d97';
  const dark = '#111111';
  const grey = '#666666';
  let fontRegular = 'Helvetica';
  let fontBold = 'Helvetica-Bold';
  try {
    doc.registerFont('SlipRegular', 'C:\\Windows\\Fonts\\arial.ttf');
    doc.registerFont('SlipBold', 'C:\\Windows\\Fonts\\arialbd.ttf');
    fontRegular = 'SlipRegular';
    fontBold = 'SlipBold';
  } catch (error) {
    // Keep built-in fonts when Arial is unavailable.
  }
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#ffffff');
  doc.fillColor(dark);

  let y = 28;
  if (logoBuffer) {
    doc.image(logoBuffer, 45, y + 1, { width: 60, height: 60 });
  } else {
    doc.circle(76, y + 26, 26).lineWidth(1).stroke(blue);
    doc.font(fontBold).fontSize(10).fillColor(blue).text('NEC', 62, y + 21);
  }

  doc.fillColor(dark).font(fontBold).fontSize(20).text('NATIONAL ENGINEERING COLLEGE', 115, y + 5);
  doc.fillColor(blue).font(fontRegular).fontSize(10).text('(An Autonomous Institution Affiliated to Anna University, Chennai)', 115, y + 33);
  doc.fillColor(blue).font(fontBold).fontSize(14).text('K.R.Nagar, Kovilpatti - 628 503.', 115, y + 48);

  doc.fillColor(dark).font(fontBold).fontSize(18).text('SALARY SLIP', 0, y + 83, { align: 'right' });
  doc.fillColor(grey).font(fontRegular).fontSize(11).text(salarySlipNo, 0, y + 118, { align: 'right' });

  const dividerY = y + 128;
  doc.moveTo(40, dividerY).lineTo(doc.page.width - 40, dividerY).lineWidth(1.5).stroke(blue);

  const leftX = 40;
  const rightX = 348;
  const leftLabelW = 132;
  const leftValueW = 168;
  const rightLabelW = 126;
  const rightValueW = 74;
  const rowH = 24;
  let infoY = dividerY + 14;
  const leftRows = [
    ['Employee:', staffNumber],
    ['Company:', companyName.toUpperCase()],
    ['Employee Name:', employeeName],
    ['Department:', deptName.toUpperCase()],
    ['Designation:', designationName],
    ['Bank Account No.:', bankAccountNo],
  ];
  const rightRows = [
    ['Start Date:', startDate ? formatDateDDMMYYYY(startDate) : '-'],
    ['End Date:', endDate ? formatDateDDMMYYYY(endDate) : '-'],
    ['Working Days:', Number(workingDays || 0).toFixed(0)],
    ['Payment Days:', Number(paymentDays || 0).toFixed(0)],
    ['Leave Without Pay:', Number(leaveWithoutPay || 0).toFixed(0)],
    ['Absent Days:', Number(absentDays || 0).toFixed(0)],
  ];

  leftRows.forEach((row, idx) => {
    const yy = infoY + (idx * rowH);
    doc.font(fontBold).fontSize(10).fillColor(dark).text(row[0], leftX, yy, { width: leftLabelW });
    doc.font(fontRegular).fontSize(10).text(row[1], leftX + leftLabelW, yy, {
      width: leftValueW,
      ellipsis: true,
      lineBreak: false,
    });
  });
  rightRows.forEach((row, idx) => {
    const yy = infoY + (idx * rowH);
    doc.font(fontBold).fontSize(10).fillColor(dark).text(row[0], rightX, yy, { width: rightLabelW });
    doc.font(fontRegular).fontSize(10).text(row[1], rightX + rightLabelW, yy, {
      width: rightValueW,
      align: 'right',
      ellipsis: true,
      lineBreak: false,
    });
  });

  const tableTop = infoY + (leftRows.length * rowH) + 16;
  const contentW = doc.page.width - (doc.page.margins.left + doc.page.margins.right);
  const tableGap = 22;
  const tableW = Math.floor((contentW - tableGap) / 2);
  const srW = 36;
  const amtW = 95;
  const compW = tableW - srW - amtW;
  const leftTableX = doc.page.margins.left;
  const rightTableX = leftTableX + tableW + tableGap;
  const headH = 24;
  const bodyH = 27;

  const drawTable = (x, top, rows) => {
    doc.rect(x, top, tableW, headH).fill(blue);
    doc.fillColor('#ffffff').font(fontBold).fontSize(10);
    doc.text('Sr', x + 6, top + 7, { width: srW - 12 });
    doc.text('Component', x + srW + 6, top + 7, { width: compW - 12 });
    doc.text('Amount', x + srW + compW + 6, top + 7, { width: amtW - 12, align: 'right' });

    let yy = top + headH;
    const renderRows = rows.length > 0 ? rows : [{ componentName: '-', calculatedAmount: 0 }];
    renderRows.forEach((item, idx) => {
      const amount = Number(item?.calculatedAmount ?? item?.proratedAmount ?? item?.baseAmount ?? 0);
      doc.rect(x, yy, srW, bodyH).fillAndStroke('#ffffff', '#c6ccd6');
      doc.rect(x + srW, yy, compW, bodyH).fillAndStroke('#ffffff', '#c6ccd6');
      doc.rect(x + srW + compW, yy, amtW, bodyH).fillAndStroke('#ffffff', '#c6ccd6');
      doc.fillColor(dark).font(fontRegular).fontSize(9);
      doc.text(String(idx + 1), x + 6, yy + 8, { width: srW - 12 });
      doc.text(String(item.componentName || '-'), x + srW + 6, yy + 8, {
        width: compW - 12,
        ellipsis: true,
        lineBreak: false,
      });
      doc.text(formatCurrencyINR(amount), x + srW + compW + 6, yy + 8, { width: amtW - 12, align: 'right' });
      yy += bodyH;
    });
    return yy;
  };

  const leftEndY = drawTable(leftTableX, tableTop, earnings);
  const rightEndY = drawTable(rightTableX, tableTop, deductions);
  const baseY = Math.max(leftEndY, rightEndY) + 24;

  const totalsX = rightTableX - 22;
  const totalsLabelW = 130;
  const totalsValueW = 160;
  const netAmount = Number(record.netSalary || 0);
  const roundedTotal = Math.round(netAmount);
  const totals = [
    ['Gross Pay:', formatCurrencyINR(record.grossSalary || 0), false],
    ['Total Deduction:', formatCurrencyINR(record.totalDeductions || 0), false],
    ['Net Pay:', formatCurrencyINR(netAmount), false],
    ['Rounded Total:', formatCurrencyINR(roundedTotal), true],
    ['Total in words:', amountToWordsINR(roundedTotal), false],
  ];

  totals.forEach((row, idx) => {
    const yy = baseY + (idx * 24);
    doc.font(fontBold).fontSize(10).fillColor(dark).text(row[0], totalsX, yy, { width: totalsLabelW });
    doc.font(row[2] ? fontBold : fontRegular).fontSize(row[2] ? 13 : 10).text(row[1], totalsX + totalsLabelW + 6, yy, {
      width: totalsValueW,
      align: row[0] === 'Total in words:' ? 'left' : 'right',
    });
  });
  doc.end();

  const buffer = await bufferPromise;
  return { buffer, fileName };
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
    const rawFromDate = String(req.query.fromDate || '').trim();
    const rawToDate = String(req.query.toDate || '').trim();
    const fromDate = toDateOnly(rawFromDate);
    const toDate = toDateOnly(rawToDate);
    const status = String(req.query.status || '').trim();

    if (companyId) where.companyId = companyId;
    if (staffId) where.staffId = staffId;
    if (rawFromDate || rawToDate) {
      if (!fromDate || !toDate) {
        return res.status(400).json({ error: 'Both valid fromDate and toDate are required' });
      }
      where.payPeriodStart = fromDate;
      where.payPeriodEnd = toDate;
    } else {
      if (salaryMonth) where.salaryMonth = salaryMonth;
      if (salaryYear) where.salaryYear = salaryYear;
    }
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
    const fromDate = req.body.fromDate;
    const toDate = req.body.toDate;
    const generatedBy = toInt(req.body.generatedBy);

    if (!companyId) {
      throw new Error('companyId is required');
    }
    const period = resolvePayPeriod({
      salaryMonth,
      salaryYear,
      fromDate,
      toDate,
      strictPastMonth: true,
    });
    const {
      start,
      end,
      daysInPeriod,
      salaryMonth: resolvedSalaryMonth,
      salaryYear: resolvedSalaryYear,
    } = period;
    const monthsInRange = getMonthsInRange(start, end);
    const periodMonthNumbers = monthsInRange.map((m) => m.month);
    const periodMonthKeys = monthsInRange.map((m) => m.key);
    const isProfessionalTaxMonth = periodMonthNumbers.includes(2) || periodMonthNumbers.includes(9);

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

    const previousGrossRows = await SalaryGeneration.findAll({
      where: {
        companyId,
        staffId: { [db.Sequelize.Op.in]: staffIds },
        payPeriodEnd: { [db.Sequelize.Op.lt]: start },
      },
      attributes: ['staffId', 'grossSalary', 'payPeriodEnd'],
      order: [['payPeriodEnd', 'DESC']],
      transaction,
    });
    const previousGrossByStaff = new Map();
    for (const row of previousGrossRows) {
      const key = String(row.staffId);
      if (!previousGrossByStaff.has(key)) previousGrossByStaff.set(key, []);
      previousGrossByStaff.get(key).push(Number(row.grossSalary || 0));
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
      const summary = buildAttendanceSummary({ attendanceRows: empAttendanceRows, leaveTypeByName, daysInMonth: daysInPeriod });
      const lossOfPayDays = Number((summary.absentDays + summary.unpaidLeaveDays).toFixed(2));
      const payableDays = Number(Math.max(0, daysInPeriod - lossOfPayDays).toFixed(2));
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
      formulaContext.payMonth = resolvedSalaryMonth;
      formulaContext.payYear = resolvedSalaryYear;
      formulaContext.payPeriodStart = start;
      formulaContext.payPeriodEnd = end;
      formulaContext.payDate = end;
      formulaContext.periodMonths = monthsInRange.length;
      formulaContext.payPeriodMonths = monthsInRange.length;
      formulaContext.monthsInPeriod = monthsInRange.length;
      formulaContext.payMonths = periodMonthNumbers.join(',');
      formulaContext.payMonthKeys = periodMonthKeys.join(',');
      formulaContext.periodDays = daysInPeriod;
      formulaContext.isProfessionalTaxMonth = isProfessionalTaxMonth ? 1 : 0;
      formulaContext.ptApplicableMonth = formulaContext.isProfessionalTaxMonth;

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
      const previousGrossValues = previousGrossByStaff.get(String(staffId)) || [];
      const trailingFiveGross = previousGrossValues.slice(0, 5);
      const sixMonthGrossTotal = Number((trailingFiveGross.reduce((sum, n) => sum + Number(n || 0), 0) + grossSalary).toFixed(2));
      const sixMonthGrossAverage = Number((sixMonthGrossTotal / (trailingFiveGross.length + 1 || 1)).toFixed(2));
      formulaContext.sixMonthGross = sixMonthGrossTotal;
      formulaContext.sixMonthGrossTotal = sixMonthGrossTotal;
      formulaContext.sixMonthGrossAverage = sixMonthGrossAverage;
      formulaContext.gross6Month = sixMonthGrossTotal;
      formulaContext.avgGross6Month = sixMonthGrossAverage;

      for (const c of deductionCandidates) {
        const baseAmount = Number(c.calculatedAmount || 0);
        const remarksMeta = parseComponentRemarks(c.remarks);
        const amountBasis = String(remarksMeta.amountBasis || 'monthly').trim().toLowerCase();
        const isPTComponent = isProfessionalTaxComponent(c);
        const calculatedAmount = isPTComponent
          ? Number(calculateProfessionalTaxDeduction(sixMonthGrossAverage, isProfessionalTaxMonth).toFixed(2))
          : c.valueType === 'Formula' && c.formulaExpression
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
          isProrated: amountBasis === 'daily' || payableDays !== daysInPeriod,
          proratedAmount: calculatedAmount,
          formula: isPTComponent
            ? 'isProfessionalTaxMonth ? slab(sixMonthGrossAverage) : 0'
            : c.formulaExpression || null,
          remarks: amountBasis === 'daily'
            ? 'Daily basis deduction prorated by payable days'
            : isPTComponent
              ? `Professional Tax slab on sixMonthGrossAverage=${sixMonthGrossAverage} (applies in Feb/Sep only)`
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
        salaryMonth: resolvedSalaryMonth,
        salaryYear: resolvedSalaryYear,
        payPeriodStart: start,
        payPeriodEnd: end,
        workingDays: daysInPeriod,
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
        where: { staffId, companyId, payPeriodStart: start, payPeriodEnd: end },
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
      salaryMonth: resolvedSalaryMonth,
      salaryYear: resolvedSalaryYear,
      payPeriodStart: start,
      payPeriodEnd: end,
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
    const fromDate = req.query.fromDate;
    const toDate = req.query.toDate;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const where = { companyId };
    let filePeriodLabel = '';
    if (fromDate || toDate) {
      const start = toDateOnly(fromDate);
      const end = toDateOnly(toDate);
      if (!start || !end) {
        return res.status(400).json({ error: 'Both valid fromDate and toDate are required' });
      }
      where.payPeriodStart = start;
      where.payPeriodEnd = end;
      filePeriodLabel = `${start}-to-${end}`;
    } else {
      if (!salaryMonth || !salaryYear) {
        return res.status(400).json({ error: 'Either fromDate/toDate or salaryMonth/salaryYear is required' });
      }
      where.salaryMonth = salaryMonth;
      where.salaryYear = salaryYear;
      filePeriodLabel = `${salaryYear}-${String(salaryMonth).padStart(2, '0')}`;
    }

    const records = await SalaryGeneration.findAll({
      where,
      include: [
        { model: Employee, as: 'employee' },
        { model: db.Company, as: 'company' },
      ],
      order: [[{ model: Employee, as: 'employee' }, 'staffNumber', 'ASC']],
    });

    if (!records.length) {
      return res.status(404).json({ message: 'No salary generation records found for the selected period' });
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

    const fileName = `salary-generation-${filePeriodLabel}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const downloadSalaryGenerationPdf = async (req, res) => {
  try {
    const companyId = toInt(req.query.companyId);
    const salaryMonth = toInt(req.query.salaryMonth);
    const salaryYear = toInt(req.query.salaryYear);
    const fromDate = req.query.fromDate;
    const toDate = req.query.toDate;
    const requestedStaffId = req.query.staffId;
    const staffId = requestedStaffId !== undefined && requestedStaffId !== null && String(requestedStaffId).trim() !== ''
      ? toInt(requestedStaffId)
      : null;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }
    if ((requestedStaffId !== undefined && requestedStaffId !== null && String(requestedStaffId).trim() !== '') && !staffId) {
      return res.status(400).json({ error: 'staffId must be a valid number' });
    }

    const where = { companyId };
    let periodLabel = '';
    let filePeriodLabel = '';
    if (fromDate || toDate) {
      const start = toDateOnly(fromDate);
      const end = toDateOnly(toDate);
      if (!start || !end) {
        return res.status(400).json({ error: 'Both valid fromDate and toDate are required' });
      }
      where.payPeriodStart = start;
      where.payPeriodEnd = end;
      periodLabel = `${start} to ${end}`;
      filePeriodLabel = `${start}-to-${end}`;
    } else {
      if (!salaryMonth || !salaryYear) {
        return res.status(400).json({ error: 'Either fromDate/toDate or salaryMonth/salaryYear is required' });
      }
      where.salaryMonth = salaryMonth;
      where.salaryYear = salaryYear;
      periodLabel = `${salaryYear}-${String(salaryMonth).padStart(2, '0')}`;
      filePeriodLabel = periodLabel;
    }
    if (staffId) {
      where.staffId = staffId;
    }

    if (staffId) {
      const record = await SalaryGeneration.findOne({
        where,
        include: [
          {
            model: Employee,
            as: 'employee',
            include: [
              { model: db.Department, as: 'department', required: false },
              { model: db.Designation, as: 'designation', required: false },
            ],
          },
          { model: Company, as: 'company' },
          { model: SalaryGenerationDetail, as: 'salaryGenerationDetails' },
        ],
        order: [[{ model: SalaryGenerationDetail, as: 'salaryGenerationDetails' }, 'componentName', 'ASC']],
      });

      if (!record) {
        return res.status(404).json({ message: 'No salary generation record found for the selected employee and period' });
      }

      const employeeName = `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.trim() || 'Employee';
      const staffNumber = String(record.employee?.staffNumber || record.staffId || '').trim() || 'Staff';
      const safeEmployeeName = toFileSafeToken(employeeName) || 'Employee';
      const safeStaffNumber = toFileSafeToken(staffNumber) || 'Staff';
      const fileName = `${safeEmployeeName}_${safeStaffNumber}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      doc.pipe(res);

      const allDetails = Array.isArray(record.salaryGenerationDetails) ? record.salaryGenerationDetails : [];
      const earnings = allDetails
        .filter((item) => String(item.componentType || '').toLowerCase() === 'earning')
        .sort((a, b) => String(a.componentName || '').localeCompare(String(b.componentName || '')));
      const deductions = allDetails
        .filter((item) => String(item.componentType || '').toLowerCase() === 'deduction')
        .sort((a, b) => String(a.componentName || '').localeCompare(String(b.componentName || '')));
      const startDate = record.payPeriodStart || where.payPeriodStart || toDateOnly(fromDate);
      const endDate = record.payPeriodEnd || where.payPeriodEnd || toDateOnly(toDate);
      const workingDays = Number(record.workingDays || (
        startDate && endDate ? daysBetweenInclusive(startDate, endDate) : 0
      ));
      const leaveWithoutPay = Number(record.unpaidLeaveDays || 0);
      const absentDays = Number(record.absentDays || 0);
      const paymentDays = Math.max(0, Number((workingDays - leaveWithoutPay - absentDays).toFixed(2)));
      const companyName = String(record.company?.companyName || 'NATIONAL ENGINEERING COLLEGE').trim();
      const deptName = record.employee?.department?.departmentName || '-';
      const designationName = record.employee?.designation?.designationName || '-';
      const bankAccountNo = record.employee?.bankAccountNumber || '-';
      const salarySlipNo = `SAL SLIP/XXXXXXXXXX/${String(record.salaryGenerationId).padStart(5, '0')}`;

      const loadLogoBuffer = async () => {
        try {
          const localLogoUrl = new URL('../../frontend/src/assets/neclogo.png', import.meta.url);
          return await readFile(localLogoUrl);
        } catch (error) {
          return null;
        }
      };
      const logoBuffer = await loadLogoBuffer();

      const blue = '#1f3d97';
      const dark = '#111111';
      const grey = '#666666';
      let fontRegular = 'Helvetica';
      let fontBold = 'Helvetica-Bold';
      try {
        doc.registerFont('SlipRegular', 'C:\\Windows\\Fonts\\arial.ttf');
        doc.registerFont('SlipBold', 'C:\\Windows\\Fonts\\arialbd.ttf');
        fontRegular = 'SlipRegular';
        fontBold = 'SlipBold';
      } catch (error) {
        // Keep built-in fonts when Arial is unavailable.
      }
      doc.rect(0, 0, doc.page.width, doc.page.height).fill('#ffffff');
      doc.fillColor(dark);

      let y = 28;
      if (logoBuffer) {
        doc.image(logoBuffer, 45, y + 1, { width: 60, height: 60 });
      } else {
        doc.circle(76, y + 26, 26).lineWidth(1).stroke(blue);
        doc.font(fontBold).fontSize(10).fillColor(blue).text('NEC', 62, y + 21);
      }

      doc.fillColor(dark).font(fontBold).fontSize(20).text('NATIONAL ENGINEERING COLLEGE', 115, y + 5);
      doc.fillColor(blue).font(fontRegular).fontSize(10).text('(An Autonomous Institution Affiliated to Anna University, Chennai)', 115, y + 33);
      doc.fillColor(blue).font(fontBold).fontSize(14).text('K.R.Nagar, Kovilpatti - 628 503.', 115, y + 48);

      doc.fillColor(dark).font(fontBold).fontSize(18).text('SALARY SLIP', 0, y + 83, { align: 'right' });
      doc.fillColor(grey).font(fontRegular).fontSize(11).text(salarySlipNo, 0, y + 118, { align: 'right' });

      const dividerY = y + 128;
      doc.moveTo(40, dividerY).lineTo(doc.page.width - 40, dividerY).lineWidth(1.5).stroke(blue);

      const leftX = 40;
      const rightX = 348;
      const leftLabelW = 132;
      const leftValueW = 168;
      const rightLabelW = 126;
      const rightValueW = 74;
      const rowH = 24;
      let infoY = dividerY + 14;
      const leftRows = [
        ['Employee:', staffNumber],
        ['Company:', companyName.toUpperCase()],
        ['Employee Name:', employeeName],
        ['Department:', deptName.toUpperCase()],
        ['Designation:', designationName],
        ['Bank Account No.:', bankAccountNo],
      ];
      const rightRows = [
        ['Start Date:', startDate ? formatDateDDMMYYYY(startDate) : '-'],
        ['End Date:', endDate ? formatDateDDMMYYYY(endDate) : '-'],
        ['Working Days:', Number(workingDays || 0).toFixed(0)],
        ['Payment Days:', Number(paymentDays || 0).toFixed(0)],
        ['Leave Without Pay:', Number(leaveWithoutPay || 0).toFixed(0)],
        ['Absent Days:', Number(absentDays || 0).toFixed(0)],
      ];

      leftRows.forEach((row, idx) => {
        const yy = infoY + (idx * rowH);
        doc.font(fontBold).fontSize(10).fillColor(dark).text(row[0], leftX, yy, { width: leftLabelW });
        doc.font(fontRegular).fontSize(10).text(row[1], leftX + leftLabelW, yy, {
          width: leftValueW,
          ellipsis: true,
          lineBreak: false,
        });
      });
      rightRows.forEach((row, idx) => {
        const yy = infoY + (idx * rowH);
        doc.font(fontBold).fontSize(10).fillColor(dark).text(row[0], rightX, yy, { width: rightLabelW });
        doc.font(fontRegular).fontSize(10).text(row[1], rightX + rightLabelW, yy, {
          width: rightValueW,
          align: 'right',
          ellipsis: true,
          lineBreak: false,
        });
      });

      const tableTop = infoY + (leftRows.length * rowH) + 16;
      const contentW = doc.page.width - (doc.page.margins.left + doc.page.margins.right);
      const tableGap = 22;
      const tableW = Math.floor((contentW - tableGap) / 2);
      const srW = 36;
      const amtW = 95;
      const compW = tableW - srW - amtW;
      const leftTableX = doc.page.margins.left;
      const rightTableX = leftTableX + tableW + tableGap;
      const headH = 24;
      const bodyH = 27;

      const drawTable = (x, top, rows) => {
        doc.rect(x, top, tableW, headH).fill(blue);
        doc.fillColor('#ffffff').font(fontBold).fontSize(10);
        doc.text('Sr', x + 6, top + 7, { width: srW - 12 });
        doc.text('Component', x + srW + 6, top + 7, { width: compW - 12 });
        doc.text('Amount', x + srW + compW + 6, top + 7, { width: amtW - 12, align: 'right' });

        let yy = top + headH;
        const renderRows = rows.length > 0 ? rows : [{ componentName: '-', calculatedAmount: 0 }];
        renderRows.forEach((item, idx) => {
          const amount = Number(item?.calculatedAmount ?? item?.proratedAmount ?? item?.baseAmount ?? 0);
          doc.rect(x, yy, srW, bodyH).fillAndStroke('#ffffff', '#c6ccd6');
          doc.rect(x + srW, yy, compW, bodyH).fillAndStroke('#ffffff', '#c6ccd6');
          doc.rect(x + srW + compW, yy, amtW, bodyH).fillAndStroke('#ffffff', '#c6ccd6');
          doc.fillColor(dark).font(fontRegular).fontSize(9);
          doc.text(String(idx + 1), x + 6, yy + 8, { width: srW - 12 });
          doc.text(String(item.componentName || '-'), x + srW + 6, yy + 8, {
            width: compW - 12,
            ellipsis: true,
            lineBreak: false,
          });
          doc.text(formatCurrencyINR(amount), x + srW + compW + 6, yy + 8, { width: amtW - 12, align: 'right' });
          yy += bodyH;
        });
        return yy;
      };

      const leftEndY = drawTable(leftTableX, tableTop, earnings);
      const rightEndY = drawTable(rightTableX, tableTop, deductions);
      const baseY = Math.max(leftEndY, rightEndY) + 24;

      const totalsX = rightTableX - 22;
      const totalsLabelW = 130;
      const totalsValueW = 160;
      const netAmount = Number(record.netSalary || 0);
      const roundedTotal = Math.round(netAmount);
      const totals = [
        ['Gross Pay:', formatCurrencyINR(record.grossSalary || 0), false],
        ['Total Deduction:', formatCurrencyINR(record.totalDeductions || 0), false],
        ['Net Pay:', formatCurrencyINR(netAmount), false],
        ['Rounded Total:', formatCurrencyINR(roundedTotal), true],
        ['Total in words:', amountToWordsINR(roundedTotal), false],
      ];

      totals.forEach((row, idx) => {
        const yy = baseY + (idx * 24);
        doc.font(fontBold).fontSize(10).fillColor(dark).text(row[0], totalsX, yy, { width: totalsLabelW });
        doc.font(row[2] ? fontBold : fontRegular).fontSize(row[2] ? 13 : 10).text(row[1], totalsX + totalsLabelW + 6, yy, {
          width: totalsValueW,
          align: row[0] === 'Total in words:' ? 'left' : 'right',
        });
      });
      doc.end();
      return;
    }

    const records = await SalaryGeneration.findAll({
      where,
      include: [{ model: Employee, as: 'employee' }],
      order: [[{ model: Employee, as: 'employee' }, 'staffNumber', 'ASC']],
    });

    if (!records.length) {
      return res.status(404).json({ message: 'No salary generation records found for the selected period' });
    }

    const fileName = `salary-generation-${filePeriodLabel}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
    doc.pipe(res);

    doc.fontSize(16).text('Salary Generation Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Period: ${periodLabel}`);
    doc.text(`Company ID: ${companyId}`);
    doc.moveDown(0.8);

    const columns = [
      { title: 'Staff No', key: 'staffNumber', width: 70 },
      { title: 'Employee Name', key: 'employeeName', width: 160 },
      { title: 'Present', key: 'presentDays', width: 55 },
      { title: 'Paid Leave', key: 'paidLeaveDays', width: 65 },
      { title: 'Unpaid Leave', key: 'unpaidLeaveDays', width: 75 },
      { title: 'Gross', key: 'grossSalary', width: 80 },
      { title: 'Net', key: 'netSalary', width: 80 },
      { title: 'Status', key: 'status', width: 70 },
    ];

    const drawHeader = (y) => {
      let x = doc.page.margins.left;
      doc.font('Helvetica-Bold').fontSize(9);
      columns.forEach((col) => {
        doc.rect(x, y, col.width, 20).stroke();
        doc.text(col.title, x + 4, y + 6, { width: col.width - 8, ellipsis: true });
        x += col.width;
      });
    };

    let y = doc.y;
    drawHeader(y);
    y += 20;

    const rowHeight = 18;
    doc.font('Helvetica').fontSize(9);
    for (const record of records) {
      if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeader(y);
        y += 20;
        doc.font('Helvetica').fontSize(9);
      }

      const row = {
        staffNumber: record.employee?.staffNumber || record.staffId,
        employeeName: `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.trim(),
        presentDays: Number(record.presentDays || 0).toFixed(2),
        paidLeaveDays: Number(record.paidLeaveDays || 0).toFixed(2),
        unpaidLeaveDays: Number(record.unpaidLeaveDays || 0).toFixed(2),
        grossSalary: Number(record.grossSalary || 0).toFixed(2),
        netSalary: Number(record.netSalary || 0).toFixed(2),
        status: record.status || '',
      };

      let x = doc.page.margins.left;
      columns.forEach((col) => {
        doc.rect(x, y, col.width, rowHeight).stroke();
        doc.text(String(row[col.key] ?? ''), x + 4, y + 5, { width: col.width - 8, ellipsis: true });
        x += col.width;
      });
      y += rowHeight;
    }

    doc.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const sendSalarySlipEmails = async (req, res) => {
  try {
    const companyId = toInt(req.body.companyId);
    const rawFromDate = String(req.body.fromDate || '').trim();
    const rawToDate = String(req.body.toDate || '').trim();
    const fromDate = toDateOnly(rawFromDate);
    const toDate = toDateOnly(rawToDate);

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }
    if (!fromDate || !toDate) {
      return res.status(400).json({ error: 'Both valid fromDate and toDate are required' });
    }
    if (fromDate > toDate) {
      return res.status(400).json({ error: 'fromDate must be before or equal to toDate' });
    }

    const records = await SalaryGeneration.findAll({
      where: {
        companyId,
        payPeriodStart: fromDate,
        payPeriodEnd: toDate,
      },
      include: [
        {
          model: Employee,
          as: 'employee',
          include: [
            { model: db.Department, as: 'department', required: false },
            { model: db.Designation, as: 'designation', required: false },
          ],
        },
        { model: Company, as: 'company' },
        { model: SalaryGenerationDetail, as: 'salaryGenerationDetails' },
      ],
      order: [[{ model: Employee, as: 'employee' }, 'staffNumber', 'ASC']],
    });

    if (!records.length) {
      return res.status(404).json({ message: 'No salary generation records found for the selected period' });
    }

    const periodLabel = `${formatDateDDMMYYYY(fromDate)} to ${formatDateDDMMYYYY(toDate)}`;
    let attempted = 0;
    let sent = 0;
    let skippedNoEmail = 0;
    let failed = 0;
    const failures = [];

    for (const record of records) {
      const recipientEmail = pickRecipientEmail(record.employee);
      if (!recipientEmail) {
        skippedNoEmail += 1;
        continue;
      }
      attempted += 1;
      try {
        const { buffer, fileName } = await createSalarySlipPdfBuffer({
          record,
          periodStart: fromDate,
          periodEnd: toDate,
        });
        const employeeName = `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.trim() || 'Employee';
        const subject = `Payslip for ${periodLabel}`;
        const text = `Hello ${employeeName},\n\nPlease find your payslip for the period from ${periodLabel} attached.\n\nThis is an automated message from your HR system. Please do not reply to this email.`;
        const html = `
          <div style="font-family:Arial, sans-serif; color:#222;">
            <p>Hello ${employeeName},</p>
            <p>Please find your payslip for the period from <strong>${periodLabel}</strong> attached.</p>
            <p style="font-size:12px;color:#888;">This is an automated message from your HR system. Please do not reply to this email.</p>
          </div>
        `;

        await sendMail({
          to: recipientEmail,
          subject,
          text,
          html,
          attachments: [{ filename: fileName, content: buffer }],
        });
        sent += 1;
      } catch (error) {
        failed += 1;
        failures.push({
          staffId: record.staffId,
          email: recipientEmail,
          error: error.message,
        });
      }
    }

    return res.json({
      period: { fromDate, toDate },
      attempted,
      sent,
      skippedNoEmail,
      failed,
      failures,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
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
