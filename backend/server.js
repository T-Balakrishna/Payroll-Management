// server.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const db = require('./models');

const app = express();
const PORT = process.env.PORT || 5000;

// ────────────────────────────────────────────────
// Middleware
// ────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ────────────────────────────────────────────────
// Basic health & root endpoints
// ────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'Payroll Management API is running!' });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

// ────────────────────────────────────────────────
// All routes — each mounted separately
// ────────────────────────────────────────────────

// Core
const companyRoutes = require('./routes/companyRoutes');
app.use('/api/companies', companyRoutes);

const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

// Organization
const departmentRoutes = require('./routes/departmentRoutes');
app.use('/api/departments', departmentRoutes);

const designationRoutes = require('./routes/designationRoutes');
app.use('/api/designations', designationRoutes);

const employeeTypeRoutes = require('./routes/employeeTypeRoutes');
app.use('/api/employeeTypes', employeeTypeRoutes);

const employeeGradeRoutes = require('./routes/employeeGradeRoutes');
app.use('/api/employeeGrades', employeeGradeRoutes);

// Employee & related
const employeeRoutes = require('./routes/employeeRoutes');
app.use('/api/employees', employeeRoutes);

const busRoutes = require('./routes/busRoutes');
app.use('/api/buses', busRoutes);

// Holiday
const holidayPlanRoutes = require('./routes/holidayPlanRoutes');
app.use('/api/holidayPlans', holidayPlanRoutes);

const holidayRoutes = require('./routes/holidayRoutes');
app.use('/api/holidays', holidayRoutes);

// Leave
const leaveTypeRoutes = require('./routes/leaveTypeRoutes');
app.use('/api/leaveTypes', leaveTypeRoutes);

const leavePolicyRoutes = require('./routes/leavePolicyRoutes');
app.use('/api/leavePolicies', leavePolicyRoutes);

const leaveAllocationRoutes = require('./routes/leaveAllocationRoutes');
app.use('/api/leaveAllocations', leaveAllocationRoutes);

const leaveRequestRoutes = require('./routes/leaveRequestRoutes');
app.use('/api/leaveRequests', leaveRequestRoutes);

const leaveApprovalRoutes = require('./routes/leaveApprovalRoutes');
app.use('/api/leaveApprovals', leaveApprovalRoutes);

const leaveRequestHistoryRoutes = require('./routes/leaveRequestHistoryRoutes');
app.use('/api/leaveRequestHistories', leaveRequestHistoryRoutes);

// Shift & Attendance
const shiftTypeRoutes = require('./routes/shiftTypeRoutes');
app.use('/api/shiftTypes', shiftTypeRoutes);

const shiftAssignmentRoutes = require('./routes/shiftAssignmentRoutes');
app.use('/api/shiftAssignments', shiftAssignmentRoutes);

const attendanceRoutes = require('./routes/attendanceRoutes');
app.use('/api/attendances', attendanceRoutes);

const biometricDeviceRoutes = require('./routes/biometricDeviceRoutes');
app.use('/api/biometricDevices', biometricDeviceRoutes);

const biometricPunchRoutes = require('./routes/biometricPunchRoutes');
app.use('/api/biometricPunches', biometricPunchRoutes);

// Salary & Payroll
const salaryComponentRoutes = require('./routes/salaryComponentRoutes');
app.use('/api/salaryComponents', salaryComponentRoutes);

const employeeSalaryComponentRoutes = require('./routes/employeeSalaryComponentRoutes');
app.use('/api/employeeSalaryComponents', employeeSalaryComponentRoutes);

const employeeSalaryMasterRoutes = require('./routes/employeeSalaryMasterRoutes');
app.use('/api/employeeSalaryMasters', employeeSalaryMasterRoutes);

const salaryGenerationRoutes = require('./routes/salaryGenerationRoutes');
app.use('/api/salaryGenerations', salaryGenerationRoutes);

const salaryGenerationDetailRoutes = require('./routes/salaryGenerationDetailRoutes');
app.use('/api/salaryGenerationDetails', salaryGenerationDetailRoutes);

const salaryRevisionHistoryRoutes = require('./routes/salaryRevisionHistoryRoutes');
app.use('/api/salaryRevisionHistories', salaryRevisionHistoryRoutes);

// Other
const employeeLoanRoutes = require('./routes/employeeLoanRoutes');
app.use('/api/employeeLoans', employeeLoanRoutes);

const formulaRoutes = require('./routes/formulaRoutes');
app.use('/api/formulas', formulaRoutes);

const permissionRoutes = require('./routes/permissionRoutes');
app.use('/api/permissions', permissionRoutes);

// ────────────────────────────────────────────────
// Start Server
// ────────────────────────────────────────────────
db.sequelize.authenticate()
  .then(() => {
    console.log('Database connection established successfully.');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
    process.exit(1);
  });

module.exports = app;