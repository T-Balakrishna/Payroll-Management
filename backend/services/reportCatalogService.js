const REPORT_NAMES = [
  '1 Month Salary Split-Up Report',
  '1 year Gross Salary Statement Month Wise Report',
  '1 year LLP Statement Month Wise Report Final',
  '1 year Salary Statement Month Wise Report',
  '1 year Total No of Days Report',
  '6 months Gross Pay - Prof Tax',
  "9' o clock to 11'o clock Staff Attendance Report",
  'ATTENDANCE DATA',
  'Checking',
  'Daily Attendance Status Report',
  'Date wise Permission Report',
  'EL Allocation Report',
  'Employee Actual Gross',
  'Employee Checkin Consolidated Report',
  'Employee Checkin Report',
  'Employee Checkin with Employee Number',
  'Genderwise Report (Total Experience , Age,...)',
  'Get Permission Days Only Report',
  'Holiday List',
  'Income Tax Report',
  'Individual Staff Attendance',
  'Last 6 months Gross Salary Report - Prof Tax',
  'Leave Application Report',
  'Leave Application Without Attendance',
  'Leave Taken Report',
  'LLP Report',
  'LLP Report (PF & NPF)',
  'Mechanical Maintenance - Previous day checkin timings',
  'Mess Deduction Report',
  'Month Wise Salary Total Report(BP,DA,HRA,CA etc)',
  'Monthly Attendance With Leave Type',
  'Monthly Attendance With Leave Type(PF & NPF)',
  'NEC EPF REPORT(Non Teaching Below 58 years)',
  'NEC EPF REPORT(Re-Employment Above 58 years)',
  'NEC EPF REPORT(Teaching Below 58 years)',
  'NEC ESI REPORT',
  'Overall Salary Register Report',
  'Permission Count Report',
  'Permission Days - NEC',
  'Regular Shift(Late Entry & Early Exit) In - Out Time Report',
  'Retirement List',
  'Salary Format Testing',
  'Staff Details Report',
  'Time Between Report',
  'Time Between(11.50am to 5.00pm) Report',
  'Total Working Days',
  'Total Working Hours',
  'WEEKLY OFF REPORT',
  'Bank Statement',
  'Income tax Deductions year wise',
  'Income tax Deductions month wise',
];

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const inferDomain = (name) => {
  const lower = name.toLowerCase();

  if (lower.includes('permission')) return 'permission';
  if (lower.includes('bank statement')) return 'employee';
  if (lower.includes('retirement') || lower.includes('staff details') || lower.includes('genderwise')) return 'employee';
  if (lower.includes('loan') || lower.includes('llp')) return 'loan';
  if (
    lower.includes('salary') ||
    lower.includes('gross') ||
    lower.includes('income tax') ||
    lower.includes('epf') ||
    lower.includes('esi') ||
    lower.includes('prof tax') ||
    lower.includes('mess deduction')
  ) {
    return 'payroll';
  }
  if (
    lower.includes('leave') ||
    lower.includes('holiday') ||
    lower.includes('el allocation')
  ) {
    return 'leave';
  }
  return 'attendance';
};

const inferCategory = (domain) => {
  switch (domain) {
    case 'payroll':
      return 'Payroll';
    case 'leave':
      return 'Leave';
    case 'permission':
      return 'Permission';
    case 'loan':
      return 'Loan';
    case 'employee':
      return 'Employee';
    default:
      return 'Attendance';
  }
};

const inferDescription = (name, domain) => {
  switch (domain) {
    case 'payroll':
      return `Payroll-focused output for ${name}.`;
    case 'leave':
      return `Leave and holiday oriented output for ${name}.`;
    case 'permission':
      return `Permission tracking output for ${name}.`;
    case 'loan':
      return `Loan and LLP oriented output for ${name}.`;
    case 'employee':
      return `Employee master output for ${name}.`;
    default:
      return `Attendance oriented output for ${name}.`;
  }
};

const inferRecommendedPeriod = (name) => {
  const lower = name.toLowerCase();
  if (lower.includes('1 year') || lower.includes('year wise')) return 'year';
  if (lower.includes('6 months') || lower.includes('last 6 months')) return 'half-year';
  if (lower.includes('1 month') || lower.includes('month wise') || lower.includes('month wise')) return 'month';
  if (lower.includes('daily') || lower.includes('previous day')) return 'day';
  return 'custom';
};

export const REPORT_CATALOG = REPORT_NAMES.map((name) => {
  const domain = inferDomain(name);
  return {
    key: slugify(name),
    name,
    category: inferCategory(domain),
    domain,
    description: inferDescription(name, domain),
    recommendedPeriod: inferRecommendedPeriod(name),
  };
});

export const getReportCatalog = () => REPORT_CATALOG;

export const getReportDefinition = (reportKey) =>
  REPORT_CATALOG.find((report) => report.key === reportKey) || null;
