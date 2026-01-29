// routes/mountRoutes.js
// This file defines (requires) all route modules and mounts them to the app

const mountRoutes = (app) => {
  // Core
  const companyRoutes = require('./companyRoutes');
  app.use('/api/companies', companyRoutes);

  const userRoutes = require('./userRoutes');
  app.use('/api/users', userRoutes);

  // Organization
  const departmentRoutes = require('./departmentRoutes');
  app.use('/api/departments', departmentRoutes);

  const designationRoutes = require('./designationRoutes');
  app.use('/api/designations', designationRoutes);

  const employeeTypeRoutes = require('./employeeTypeRoutes');
  app.use('/api/employeeTypes', employeeTypeRoutes);

  const employeeGradeRoutes = require('./employeeGradeRoutes');
  app.use('/api/employeeGrades', employeeGradeRoutes);

  // Employee & related
  const employeeRoutes = require('./employeeRoutes');
  app.use('/api/employees', employeeRoutes);

  const busRoutes = require('./busRoutes');
  app.use('/api/buses', busRoutes);

  // Holiday
  const holidayPlanRoutes = require('./holidayPlanRoutes');
  app.use('/api/holidayPlans', holidayPlanRoutes);

  const holidayRoutes = require('./holidayRoutes');
  app.use('/api/holidays', holidayRoutes);

  // Leave
  const leaveTypeRoutes = require('./leaveTypeRoutes');
  app.use('/api/leaveTypes', leaveTypeRoutes);

  const leavePolicyRoutes = require('./leavePolicyRoutes');
  app.use('/api/leavePolicies', leavePolicyRoutes);

  const leaveAllocationRoutes = require('./leaveAllocationRoutes');
  app.use('/api/leaveAllocations', leaveAllocationRoutes);

  const leaveRequestRoutes = require('./leaveRequestRoutes');
  app.use('/api/leaveRequests', leaveRequestRoutes);

  const leaveApprovalRoutes = require('./leaveApprovalRoutes');
  app.use('/api/leaveApprovals', leaveApprovalRoutes);

  const leaveRequestHistoryRoutes = require('./leaveRequestHistoryRoutes');
  app.use('/api/leaveRequestHistories', leaveRequestHistoryRoutes);

  // Shift & Attendance
  const shiftTypeRoutes = require('./shiftTypeRoutes');
  app.use('/api/shiftTypes', shiftTypeRoutes);

  const shiftAssignmentRoutes = require('./shiftAssignmentRoutes');
  app.use('/api/shiftAssignments', shiftAssignmentRoutes);

  const attendanceRoutes = require('./attendanceRoutes');
  app.use('/api/attendances', attendanceRoutes);

  const biometricDeviceRoutes = require('./biometricDeviceRoutes');
  app.use('/api/biometricDevices', biometricDeviceRoutes);

  const biometricPunchRoutes = require('./biometricPunchRoutes');
  app.use('/api/biometricPunches', biometricPunchRoutes);

  // Salary & Payroll
  const salaryComponentRoutes = require('./salaryComponentRoutes');
  app.use('/api/salaryComponents', salaryComponentRoutes);

  const employeeSalaryComponentRoutes = require('./employeeSalaryComponentRoutes');
  app.use('/api/employeeSalaryComponents', employeeSalaryComponentRoutes);

  const employeeSalaryMasterRoutes = require('./employeeSalaryMasterRoutes');
  app.use('/api/employeeSalaryMasters', employeeSalaryMasterRoutes);

  const salaryGenerationRoutes = require('./salaryGenerationRoutes');
  app.use('/api/salaryGenerations', salaryGenerationRoutes);

  const salaryGenerationDetailRoutes = require('./salaryGenerationDetailRoutes');
  app.use('/api/salaryGenerationDetails', salaryGenerationDetailRoutes);

  const salaryRevisionHistoryRoutes = require('./salaryRevisionHistoryRoutes');
  app.use('/api/salaryRevisionHistories', salaryRevisionHistoryRoutes);

  // Other / Auxiliary
  const employeeLoanRoutes = require('./employeeLoanRoutes');
  app.use('/api/employeeLoans', employeeLoanRoutes);

  const formulaRoutes = require('./formulaRoutes');
  app.use('/api/formulas', formulaRoutes);

  const permissionRoutes = require('./permissionRoutes');
  app.use('/api/permissions', permissionRoutes);

  const statuaryReportsRoutes = require('./statutoryReportsRoutes');
  app.use('/api/statuaryReports', statuaryReportsRoutes);

  const googleAuthRoutes = require('./googleAuthRoutes');
  app.use('/api/google-auth', googleAuthRoutes);
};

module.exports = mountRoutes;