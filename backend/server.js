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
// Routes
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

// Employee routes
const employeeRoutes = require('./routes/employeeRoutes');
app.use('/api/employees', employeeRoutes);

// ────────────────────────────────────────────────
// Models to sync — UNCOMMENT ONE LINE AT A TIME
// Keep the order roughly correct (parents before children)
// ────────────────────────────────────────────────
// const modelsToSync = [
//   // db.Company,
//   // db.Attendance,
//   // db.BiometricDevice,
//   // db.BiometricPunch,
//   // db.Bus,
//   // db.User,
//   // db.Department,
//   // db.Designation,
//   // db.Employee,
//   // db.EmployeeGrade,
//   // db.EmployeeLoan,
//   // db.EmployeeSalaryComponent,
//   // db.EmployeeSalaryMaster,
//   // db.EmployeeType,
//   // db.Formula,                 
//   // db.googleAuth,              
//   // db.Holiday,           
//   // db.HolidayPlan,       
//   // db.LeaveAllocation,
//   // db.LeaveApproval,
//   // db.LeavePolicy,
//   // db.LeaveType,
//   // db.LeaveRequestHistory,
//   // db.LeaveType,
//   // db.SalaryComponent,
//   // db.SalaryGeneration,
//   // db.SalaryGenerationDetail,
//   // db.SalaryRevisionHistory,
//   // db.ShiftAssignment,
//   // db.ShiftType,
// ];

const modelsToSync = [
  // ────────────────────────────────────────────────
  //  1. Core / independent / almost no dependencies
  // ────────────────────────────────────────────────
  db.Company,
  db.User,
  db.Department,
  db.Designation,
  db.EmployeeType,
  db.EmployeeGrade,
  db.HolidayPlan,
  db.Holiday,
  db.LeaveType,
  db.ShiftType,

  // ────────────────────────────────────────────────
  //  2. Main entities that many tables reference
  // ────────────────────────────────────────────────
  db.Employee, 

  // ────────────────────────────────────────────────
  //  3. Structures & masters (often referenced by generations / history)
  // ────────────────────────────────────────────────
  db.SalaryComponent,
  db.EmployeeSalaryComponent,
  db.EmployeeSalaryMaster, 
  db.Formula,

  // ────────────────────────────────────────────────
  //  4. Leave related – depends on Employee + LeaveType + Policy
  // ────────────────────────────────────────────────
  db.LeavePolicy,
  db.LeaveAllocation,
  db.LeaveRequest,
  db.LeaveApproval,
  // db.LeaveRequestHistory,     // ← usually depends on LeaveRequest

  // ────────────────────────────────────────────────
  //  5. Shift & Attendance – depends on Employee + ShiftType
  // ────────────────────────────────────────────────
  db.ShiftAssignment,
  db.Attendance,
  db.BiometricDevice,
  db.BiometricPunch,

  // ────────────────────────────────────────────────
  //  6. Payroll runs & history – depend on Employee + Salary masters
  // ────────────────────────────────────────────────
  db.SalaryGeneration,
  db.SalaryGenerationDetail,
  db.SalaryRevisionHistory,

  // ────────────────────────────────────────────────
  //  7. Other / financial / auxiliary
  // ────────────────────────────────────────────────
  db.EmployeeLoan,
  db.Bus,

  // ────────────────────────────────────────────────
  //  8. Least dependent / utility
  // ────────────────────────────────────────────────
  db.googleAuth,
];
// ────────────────────────────────────────────────
// Database + Server startup
// ────────────────────────────────────────────────
async function startServer() {
  try {
    await db.sequelize.authenticate();
    console.log('Database connection established successfully.');

    if (process.env.NODE_ENV === 'development' && process.env.DB_SYNC === 'true') {
      console.log('');
      console.log('╔════════════════════════════════════════════╗');
      console.log('║     DEVELOPMENT MODE - MODEL SYNC          ║');
      console.log('║   Uncomment one model at a time above      ║');
      console.log('╚════════════════════════════════════════════╝');
      console.log('');

      await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');

      console.log(`Models selected for sync: ${modelsToSync.length}`);

      let success = 0;
      let failed = 0;

      for (const Model of modelsToSync) {
        if (!Model) {
          console.warn('→ Skipping undefined model');
          continue;
        }

        const name = Model.name || '(unnamed)';
        const table = Model.tableName || '(unknown table)';

        try {
          await Model.sync({ force: true });
          console.log(`✔  ${name.padEnd(22)} → ${table}`);
          success++;
        } catch (err) {
          console.log(`✘  ${name.padEnd(22)} → FAILED`);
          console.log(`   Table: ${table}`);
          console.log(`   → ${err.message}`);
          failed++;
          // You can decide whether to continue or stop:
          // if you want to stop → uncomment next line
          // throw err;
        }
      }

      await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');

      console.log('');
      console.log(`Sync summary:  ${success} succeeded  /  ${failed} failed`);
      console.log('');
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;