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
import reportGeneratorRoutes from './reportGeneratorRoutes.js';

const mountRoutes = (app) => {
  // Core
  app.use('/companies', companyRoutes);

  app.use('/users', userRoutes);

  app.use('/roles', roleRoutes);

  app.use('/auth', authRoutes);

  // Organization
  app.use('/departments', departmentRoutes);

  app.use('/designations', designationRoutes);


  app.use('/employeeGrades', employeeGradeRoutes);

  // Employee & related
  app.use('/employees', employeeRoutes);

  app.use('/buses', busRoutes);

  // Holiday
  app.use('/holidayPlans', holidayPlanRoutes);

  app.use('/holidays', holidayRoutes);

  // Leave
  app.use('/leaveTypes', leaveTypeRoutes);
  app.use('/leavePeriods', leavePeriodRoutes);

  app.use('/leavePolicies', leavePolicyRoutes);

  app.use('/leaveAllocations', leaveAllocationRoutes);

  app.use('/leaveRequests', leaveRequestRoutes);

  app.use('/leaveApprovals', leaveApprovalRoutes);

  app.use('/leaveRequestHistories', leaveRequestHistoryRoutes);

  // Shift & Attendance
  app.use('/shiftTypes', shiftTypeRoutes);

  app.use('/shiftAssignments', shiftAssignmentRoutes);

  app.use('/attendances', attendanceRoutes);

  app.use('/biometricDevices', biometricDeviceRoutes);

  app.use('/biometricPunches', biometricPunchRoutes);

  // Salary & Payroll
  app.use('/salaryComponents', salaryComponentRoutes);

  app.use('/employeeSalaryComponents', employeeSalaryComponentRoutes);

  app.use('/employeeSalaryMasters', employeeSalaryMasterRoutes);

  app.use('/salaryGenerations', salaryGenerationRoutes);

  app.use('/salaryGenerationDetails', salaryGenerationDetailRoutes);

  app.use('/salaryRevisionHistories', salaryRevisionHistoryRoutes);

  // Other / Auxiliary
  app.use('/employeeLoans', employeeLoanRoutes);

  app.use('/formulas', formulaRoutes);

  app.use('/permissions', permissionRoutes);

  app.use('/statuaryReports', statuaryReportsRoutes);

  app.use('/reportGenerator', reportGeneratorRoutes);
};

export default mountRoutes;
