import { Op } from 'sequelize';
import db from '../models/index.js';
import { getReportCatalog, getReportDefinition } from '../services/reportCatalogService.js';

const { Attendance, Department, Employee, EmployeeLoan, LeaveRequest, LeaveType, Permission, SalaryGeneration } = db;

const MAX_PREVIEW_ROWS = 100;

const parseInteger = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseIntegerList = (value) => {
  if (Array.isArray(value)) {
    return value.map(parseInteger).filter((item) => item !== null);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => parseInteger(item.trim()))
      .filter((item) => item !== null);
  }
  const parsed = parseInteger(value);
  return parsed === null ? [] : [parsed];
};

const toDateString = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const escapeCsv = (value) => {
  const stringValue = value === undefined || value === null ? '' : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const buildFilters = (source) => ({
  companyId: parseInteger(source.companyId),
  departmentIds: parseIntegerList(source.departmentIds ?? source.departmentId),
  startDate: toDateString(source.startDate),
  endDate: toDateString(source.endDate),
  format: String(source.format || 'json').toLowerCase(),
});

const attachDepartmentFilter = (employeeWhere, filters) => {
  if (filters.departmentIds.length) {
    employeeWhere.departmentId = { [Op.in]: filters.departmentIds };
  }
};

const buildDateRange = (filters) => {
  if (filters.startDate && filters.endDate) {
    return { [Op.between]: [filters.startDate, filters.endDate] };
  }
  if (filters.startDate) {
    return { [Op.gte]: filters.startDate };
  }
  if (filters.endDate) {
    return { [Op.lte]: filters.endDate };
  }
  return null;
};

const formatPersonName = (employee) =>
  [employee?.firstName, employee?.middleName, employee?.lastName].filter(Boolean).join(' ').trim();

const queryAttendanceRows = async (filters) => {
  const where = {};
  if (filters.companyId) where.companyId = filters.companyId;
  const attendanceDate = buildDateRange(filters);
  if (attendanceDate) where.attendanceDate = attendanceDate;

  const employeeWhere = {};
  attachDepartmentFilter(employeeWhere, filters);

  const rows = await Attendance.findAll({
    where,
    include: [
      {
        model: Employee,
        as: 'employee',
        where: employeeWhere,
        attributes: ['staffId', 'staffNumber', 'firstName', 'lastName', 'departmentId'],
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['departmentId', 'departmentName'],
          },
        ],
      },
    ],
    order: [['attendanceDate', 'DESC']],
    limit: MAX_PREVIEW_ROWS,
  });

  const columns = ['Date', 'Staff No', 'Employee', 'Department', 'Status', 'Check In', 'Check Out', 'Working Hours'];
  const data = rows.map((row) => ({
    date: row.attendanceDate,
    staffNumber: row.employee?.staffNumber || '',
    employeeName: formatPersonName(row.employee),
    department: row.employee?.department?.departmentName || '',
    status: row.attendanceStatus,
    checkIn: row.firstCheckIn || '',
    checkOut: row.lastCheckOut || '',
    workingHours: row.workingHours || 0,
  }));

  return { columns, data };
};

const queryPayrollRows = async (filters) => {
  const where = {};
  if (filters.companyId) where.companyId = filters.companyId;
  const payPeriodStart = buildDateRange(filters);
  if (payPeriodStart) where.payPeriodStart = payPeriodStart;

  const employeeWhere = {};
  attachDepartmentFilter(employeeWhere, filters);

  const rows = await SalaryGeneration.findAll({
    where,
    include: [
      {
        model: Employee,
        as: 'employee',
        where: employeeWhere,
        attributes: ['staffId', 'staffNumber', 'firstName', 'lastName', 'departmentId'],
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['departmentId', 'departmentName'],
          },
        ],
      },
    ],
    order: [['salaryYear', 'DESC'], ['salaryMonth', 'DESC']],
    limit: MAX_PREVIEW_ROWS,
  });

  const columns = ['Year', 'Month', 'Staff No', 'Employee', 'Department', 'Gross', 'Deductions', 'Net', 'Status'];
  const data = rows.map((row) => ({
    year: row.salaryYear,
    month: row.salaryMonth,
    staffNumber: row.employee?.staffNumber || '',
    employeeName: formatPersonName(row.employee),
    department: row.employee?.department?.departmentName || '',
    grossSalary: row.grossSalary || 0,
    totalDeductions: row.totalDeductions || 0,
    netSalary: row.netSalary || 0,
    status: row.status,
  }));

  return { columns, data };
};

const queryLeaveRows = async (filters) => {
  const where = {};
  if (filters.companyId) where.companyId = filters.companyId;
  const startDate = buildDateRange(filters);
  if (startDate) where.startDate = startDate;

  const employeeWhere = {};
  attachDepartmentFilter(employeeWhere, filters);

  const rows = await LeaveRequest.findAll({
    where,
    include: [
      {
        model: Employee,
        as: 'employee',
        where: employeeWhere,
        attributes: ['staffId', 'staffNumber', 'firstName', 'lastName', 'departmentId'],
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['departmentId', 'departmentName'],
          },
        ],
      },
      {
        model: LeaveType,
        as: 'leaveType',
        attributes: ['leaveTypeId', 'leaveTypeName'],
      },
    ],
    order: [['startDate', 'DESC']],
    limit: MAX_PREVIEW_ROWS,
  });

  const columns = ['Start Date', 'End Date', 'Staff No', 'Employee', 'Department', 'Leave Type', 'Days', 'Status'];
  const data = rows.map((row) => ({
    startDate: row.startDate,
    endDate: row.endDate,
    staffNumber: row.employee?.staffNumber || '',
    employeeName: formatPersonName(row.employee),
    department: row.employee?.department?.departmentName || '',
    leaveType: row.leaveType?.leaveTypeName || '',
    totalDays: row.totalDays || 0,
    status: row.status,
  }));

  return { columns, data };
};

const queryPermissionRows = async (filters) => {
  const where = {};
  if (filters.companyId) where.companyId = filters.companyId;
  const permissionDate = buildDateRange(filters);
  if (permissionDate) where.permissionDate = permissionDate;

  const employeeWhere = {};
  attachDepartmentFilter(employeeWhere, filters);

  const rows = await Permission.findAll({
    where,
    include: [
      {
        model: Employee,
        as: 'employee',
        where: employeeWhere,
        attributes: ['staffId', 'staffNumber', 'firstName', 'lastName', 'departmentId'],
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['departmentId', 'departmentName'],
          },
        ],
      },
    ],
    order: [['permissionDate', 'DESC']],
    limit: MAX_PREVIEW_ROWS,
  });

  const columns = ['Date', 'Staff No', 'Employee', 'Department', 'Hours', 'Start Time', 'End Time', 'Notes'];
  const data = rows.map((row) => ({
    date: row.permissionDate,
    staffNumber: row.employee?.staffNumber || '',
    employeeName: formatPersonName(row.employee),
    department: row.employee?.department?.departmentName || '',
    permissionHours: row.permissionHours || 0,
    startTime: row.permissionStartTime || '',
    endTime: row.permissionEndTime || '',
    notes: row.notes || '',
  }));

  return { columns, data };
};

const queryLoanRows = async (filters) => {
  const sanctionDate = buildDateRange(filters);
  const rows = await EmployeeLoan.findAll({
    where: sanctionDate ? { sanctionDate } : {},
    include: [
      {
        model: Employee,
        as: 'employee',
        where: filters.departmentIds.length ? { departmentId: { [Op.in]: filters.departmentIds } } : {},
        attributes: ['staffId', 'staffNumber', 'firstName', 'lastName', 'departmentId', 'companyId'],
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['departmentId', 'departmentName'],
          },
        ],
      },
    ],
    order: [['sanctionDate', 'DESC']],
    limit: MAX_PREVIEW_ROWS,
  });

  const filteredRows = rows.filter((row) => !filters.companyId || Number(row.employee?.companyId) === Number(filters.companyId));
  const columns = ['Sanction Date', 'Staff No', 'Employee', 'Department', 'Loan Type', 'Loan Amount', 'Installment', 'Status'];
  const data = filteredRows.map((row) => ({
    sanctionDate: row.sanctionDate,
    staffNumber: row.employee?.staffNumber || '',
    employeeName: formatPersonName(row.employee),
    department: row.employee?.department?.departmentName || '',
    loanType: row.loanType,
    loanAmount: row.loanAmount || 0,
    installmentAmount: row.installmentAmount || 0,
    status: row.status,
  }));

  return { columns, data };
};

const queryEmployeeRows = async (filters) => {
  const where = {};
  if (filters.companyId) where.companyId = filters.companyId;
  if (filters.departmentIds.length) where.departmentId = { [Op.in]: filters.departmentIds };

  const rows = await Employee.findAll({
    where,
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['departmentId', 'departmentName'],
      },
    ],
    order: [['firstName', 'ASC']],
    limit: MAX_PREVIEW_ROWS,
  });

  const columns = ['Staff No', 'Employee', 'Company', 'Department', 'Gender', 'DOJ', 'Status', 'Payment Mode'];
  const data = rows.map((row) => ({
    staffNumber: row.staffNumber || '',
    employeeName: formatPersonName(row),
    company: row.companyId || '',
    department: row.department?.departmentName || '',
    gender: row.gender || '',
    dateOfJoining: row.dateOfJoining || '',
    status: row.employmentStatus || row.status || '',
    paymentMode: row.paymentMode || '',
  }));

  return { columns, data };
};

const buildDataset = async (report, filters) => {
  switch (report.domain) {
    case 'payroll':
      return queryPayrollRows(filters);
    case 'leave':
      return queryLeaveRows(filters);
    case 'permission':
      return queryPermissionRows(filters);
    case 'loan':
      return queryLoanRows(filters);
    case 'employee':
      return queryEmployeeRows(filters);
    default:
      return queryAttendanceRows(filters);
  }
};

const buildSummary = (report, dataset) => ({
  reportName: report.name,
  category: report.category,
  domain: report.domain,
  rowCount: dataset.data.length,
  generatedAt: new Date().toISOString(),
});

const datasetToCsv = (dataset) => {
  if (!dataset.columns.length) return '';
  const headerRow = dataset.columns.map(escapeCsv).join(',');
  const keyOrder = Object.keys(dataset.data[0] || {});
  const dataRows = dataset.data.map((row) =>
    keyOrder.map((key) => escapeCsv(row[key])).join(',')
  );
  return [headerRow, ...dataRows].join('\n');
};

export const getAvailableReports = async (_req, res) => {
  res.json({
    success: true,
    data: getReportCatalog(),
  });
};

export const previewReport = async (req, res) => {
  try {
    const reportKey = String(req.query.reportKey || '');
    const report = getReportDefinition(reportKey);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report definition not found',
      });
    }

    const filters = buildFilters(req.query);
    const dataset = await buildDataset(report, filters);

    res.json({
      success: true,
      report,
      filters,
      summary: buildSummary(report, dataset),
      columns: dataset.columns,
      data: dataset.data,
    });
  } catch (error) {
    console.error('Preview report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report preview',
      error: error.message,
    });
  }
};

export const downloadReport = async (req, res) => {
  try {
    const reportKey = String(req.query.reportKey || '');
    const report = getReportDefinition(reportKey);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report definition not found',
      });
    }

    const filters = buildFilters(req.query);
    const dataset = await buildDataset(report, filters);
    const csv = datasetToCsv(dataset);
    const fileName = `${report.key}-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(csv);
  } catch (error) {
    console.error('Download report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download report',
      error: error.message,
    });
  }
};
