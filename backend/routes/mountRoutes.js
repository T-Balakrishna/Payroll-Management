// routes/mountRoutes.js
// This file defines (requires) all route modules and mounts them to the app

import companyRoutes from './companyRoutes.js';
import userRoutes from './userRoutes.js';
import roleRoutes from './roleRoutes.js';
import authRoutes from './authRoutes.js';
import departmentRoutes from './departmentRoutes.js';
import designationRoutes from './designationRoutes.js';
import employeeGradeRoutes from './employeeGradeRoutes.js';
import employeeRoutes from './employeeRoutes.js';
import busRoutes from './busRoutes.js';
import holidayPlanRoutes from './holidayPlanRoutes.js';
import holidayRoutes from './holidayRoutes.js';
import leaveTypeRoutes from './leaveTypeRoutes.js';
import leavePeriodRoutes from './leavePeriodRoutes.js';
import leavePolicyRoutes from './leavePolicyRoutes.js';
import leaveAllocationRoutes from './leaveAllocationRoutes.js';
import leaveRequestRoutes from './leaveRequestRoutes.js';
import leaveApprovalRoutes from './leaveApprovalRoutes.js';
import leaveRequestHistoryRoutes from './leaveRequestHistoryRoutes.js';
import shiftTypeRoutes from './shiftTypeRoutes.js';
import shiftAssignmentRoutes from './shiftAssignmentRoutes.js';
import attendanceRoutes from './attendanceRoutes.js';
import biometricDeviceRoutes from './biometricDeviceRoutes.js';
import biometricPunchRoutes from './biometricPunchRoutes.js';
import salaryComponentRoutes from './salaryComponentRoutes.js';
import employeeSalaryComponentRoutes from './employeeSalaryComponentRoutes.js';
import employeeSalaryMasterRoutes from './employeeSalaryMasterRoutes.js';
import salaryGenerationRoutes from './salaryGenerationRoutes.js';
import salaryGenerationDetailRoutes from './salaryGenerationDetailRoutes.js';
import salaryRevisionHistoryRoutes from './salaryRevisionHistoryRoutes.js';
import employeeLoanRoutes from './employeeLoanRoutes.js';
import formulaRoutes from './formulaRoutes.js';
import permissionRoutes from './permissionRoutes.js';
import statuaryReportsRoutes from './statutoryReportsRoutes.js';

const mountRoutes = (app) => {
  // Core
  app.use('/api/companies', companyRoutes);

  app.use('/api/users', userRoutes);

  app.use('/api/roles', roleRoutes);

  app.use('/api/auth', authRoutes);

  // Organization
  app.use('/api/departments', departmentRoutes);

  app.use('/api/designations', designationRoutes);


  app.use('/api/employeeGrades', employeeGradeRoutes);

  // Employee & related
  app.use('/api/employees', employeeRoutes);

  app.use('/api/buses', busRoutes);

  // Holiday
  app.use('/api/holidayPlans', holidayPlanRoutes);

  app.use('/api/holidays', holidayRoutes);

  // Leave
  app.use('/api/leaveTypes', leaveTypeRoutes);
  app.use('/api/leavePeriods', leavePeriodRoutes);

  app.use('/api/leavePolicies', leavePolicyRoutes);

  app.use('/api/leaveAllocations', leaveAllocationRoutes);

  app.use('/api/leaveRequests', leaveRequestRoutes);

  app.use('/api/leaveApprovals', leaveApprovalRoutes);

  app.use('/api/leaveRequestHistories', leaveRequestHistoryRoutes);

  // Shift & Attendance
  app.use('/api/shiftTypes', shiftTypeRoutes);

  app.use('/api/shiftAssignments', shiftAssignmentRoutes);

  app.use('/api/attendances', attendanceRoutes);

  app.use('/api/biometricDevices', biometricDeviceRoutes);

  app.use('/api/biometricPunches', biometricPunchRoutes);

  // Salary & Payroll
  app.use('/api/salaryComponents', salaryComponentRoutes);

  app.use('/api/employeeSalaryComponents', employeeSalaryComponentRoutes);

  app.use('/api/employeeSalaryMasters', employeeSalaryMasterRoutes);

  app.use('/api/salaryGenerations', salaryGenerationRoutes);

  app.use('/api/salaryGenerationDetails', salaryGenerationDetailRoutes);

  app.use('/api/salaryRevisionHistories', salaryRevisionHistoryRoutes);

  // Other / Auxiliary
  app.use('/api/employeeLoans', employeeLoanRoutes);

  app.use('/api/formulas', formulaRoutes);

  app.use('/api/permissions', permissionRoutes);

  app.use('/api/statuaryReports', statuaryReportsRoutes);
};

export default mountRoutes;
