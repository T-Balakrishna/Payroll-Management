const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const seq = require('./config/db');
const cron = require("node-cron");
const path = require("path");
const app = express();

// ✅ Middlewares
app.use(helmet());
app.use(morgan('dev'));
app.use(cors({
  origin: 'http://localhost:5173', // React dev server
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true, // if you use cookies/auth
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Serve employee photos
app.use('/uploads/', express.static(path.join(__dirname, 'uploads/employees')));


// ✅ Routes
const attendanceRoutes = require("./routes/attendanceRoute");
const biometricDeviceRoute = require('./routes/biometricDeviceRoute');
const busRoute = require('./routes/busRoute');
const casteRoute = require('./routes/casteRoute');
const companyRoute = require('./routes/companyRoute');
const departmentRoute = require('./routes/departmentRoute');
const designationRoute = require('./routes/designationRoute');
const employeeGradeRoute = require('./routes/employeeGradeRoute');
const employeeRoute = require('./routes/employeeRoute');
const employeeTypeRoute = require('./routes/employeeTypeRoute');
const holidayRoute = require('./routes/holidayRoute');
const holidayPlanRoute = require('./routes/holidayPlanRoute');
const leaveAllocationRoute = require('./routes/leaveAllocationRoute');
const leaveTypeRoute = require('./routes/leaveTypeRoute');
const leaveRoute = require('./routes/leaveRoute');
const punchRoute = require('./routes/punchRoute');
const religionRoute = require('./routes/religionRoute');
const shiftRoute = require('./routes/shiftRoute');
const userRoute = require('./routes/userRoute');  
const authRoute = require('./routes/authRoute');  
const shiftAllocationRoutes = require("./routes/shiftAllocationRoutes");

// Services
const processAttendance = require("./services/processAttendance");
const fetchBiometrics = require("./services/fetchBiometrics");

// Map routes
app.use("/api/attendance", attendanceRoutes);
app.use('/api/biometricDevices', biometricDeviceRoute);
app.use('/api/buses', busRoute);
app.use('/api/castes', casteRoute);
app.use('/api/companies', companyRoute);
app.use('/api/departments', departmentRoute);
app.use('/api/designations', designationRoute);
app.use('/api/employees', employeeRoute);
app.use('/api/employeeGrades', employeeGradeRoute);
app.use('/api/employeeTypes', employeeTypeRoute);
app.use('/api/holidays', holidayRoute);
app.use('/api/holidayPlans', holidayPlanRoute);
app.use('/api/leaveAllocations', leaveAllocationRoute);
app.use('/api/leaveTypes', leaveTypeRoute);
app.use('/api/leaves', leaveRoute);
app.use('/api/punches', punchRoute);
app.use('/api/religions', religionRoute);
app.use('/api/shifts', shiftRoute);
app.use('/api/users', userRoute);
app.use('/api/auth', authRoute);
app.use("/api/shiftAllocation", shiftAllocationRoutes);

// ✅ Central model loading (replaces individual requires)
require('./models');  // Triggers index.js: loads all models + associations

// ✅ Start server
const startServer = async () => {
  try {
    await seq.authenticate();
    console.log("✅ DB Connected successfully");

    // ⚠️ safer: alter = keep data, adjust schema if needed
    await seq.sync({ alter: false, logging: false });
    console.log("✅ Tables synced");

    app.listen(5000, () => {
      console.log("🚀 Listening at http://localhost:5000");
    });

    // 🕛 Monthly permission hours reset at midnight on the 1st
    cron.schedule("0 0 1 * *", async () => {
      try {
        const { resetPermissionHours } = require("./services/fillRemainingPermissionHours");
        await resetPermissionHours();
      } catch (err) {
        console.error("❌ Error resetting permission hours:", err.message);
      }
    });
    // 🕛 Hourly biometric fetch (uncomment if needed)
    cron.schedule("* * * * *", async () => {
      try {
        console.log("🕛 Running hourly biometric fetch...");
        await fetchBiometrics();
      } catch (err) {
        console.error("❌ Error fetching biometrics:", err.message);
      }
    });

    // 🕛 Daily attendance processor at 12:00 AM (uncomment if needed)
    cron.schedule("* * * * *", async () => {  // Fixed: proper cron for midnight
      try {
        console.log("🕛 Running daily attendance processor...");
        await processAttendance();
      } catch (err) {
        console.error("❌ Error processing attendance:", err.message);
      }
    });

  } catch (error) {
    console.error("❌ Error starting server:", error.message);
  }
};

startServer();