// mounts.js  (or routes/mountRoutes.js)
// Central place to mount all routes — keeps server.js clean

module.exports = (app) => {
  // Core
  app.use('/api/companies', require('./routes/companyRoutes'));
  app.use('/api/users', require('./routes/userRoutes'));

  // Organization
  app.use('/api/departments', require('./routes/departmentRoutes'));
  app.use('/api/designations', require('./routes/designationRoutes'));
  app.use('/api/employeeTypes', require('./routes/employeeTypeRoutes'));
  app.use('/api/employeeGrades', require('./routes/employeeGradeRoutes'));

  // Employee & related
  app.use('/api/employees', require('./routes/employeeRoutes'));
  app.use('/api/buses', require('./routes/busRoutes'));

  // Holiday
  app.use('/api/holidayPlans', require('./routes/holidayPlanRoutes'));
  app.use('/api/holidays', require('./routes/holidayRoutes'));

  // Leave
  app.use('/api/leaveTypes', require('./routes/leaveTypeRoutes'));
  app.use('/api/leavePolicies', require('./routes/leavePolicyRoutes'));
  app.use('/api/leaveAllocations', require('./routes/leaveAllocationRoutes'));
  app.use('/api/leaveRequests', require('./routes/leaveRequestRoutes'));
  app.use('/api/leaveApprovals', require('./routes/leaveApprovalRoutes'));
  app.use('/api/leaveRequestHistories', require('./routes/leaveRequestHistoryRoutes'));

  // Shift & Attendance
  app.use('/api/shiftTypes', require('./routes/shiftTypeRoutes'));
  app.use('/api/shiftAssignments', require('./routes/shiftAssignmentRoutes'));
  app.use('/api/attendances', require('./routes/attendanceRoutes'));
  app.use('/api/biometricDevices', require('./routes/biometricDeviceRoutes'));
  app.use('/api/biometricPunches', require('./routes/biometricPunchRoutes'));

  // Salary & Payroll
  app.use('/api/salaryComponents', require('./routes/salaryComponentRoutes'));
  app.use('/api/employeeSalaryComponents', require('./routes/employeeSalaryComponentRoutes'));
  app.use('/api/employeeSalaryMasters', require('./routes/employeeSalaryMasterRoutes'));
  app.use('/api/salaryGenerations', require('./routes/salaryGenerationRoutes'));
  app.use('/api/salaryGenerationDetails', require('./routes/salaryGenerationDetailRoutes'));
  app.use('/api/salaryRevisionHistories', require('./routes/salaryRevisionHistoryRoutes'));

  // Other / Auxiliary
  app.use('/api/employeeLoans', require('./routes/employeeLoanRoutes'));
  app.use('/api/formulas', require('./routes/formulaRoutes'));
  app.use('/api/permissions', require('./routes/permissionRoutes'));
};