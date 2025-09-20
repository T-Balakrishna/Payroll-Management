const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const seq = require('./config/db');
const cron = require("node-cron");

const app = express();

// ✅ Middlewares
app.use(helmet());
app.use(morgan('dev'));
app.use(cors({
  origin: "http://localhost:5173", // your React frontend
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Routes
const attendanceRoute = require('./routes/attendanceRoute');
const biometricRoute = require('./routes/biometricRoute');
const biometricDeviceRoute = require('./routes/biometricDeviceRoute');
const busRoute = require('./routes/busRoute');
const casteRoute = require('./routes/casteRoute');
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
app.use('/api/attendance', attendanceRoute);
app.use('/api/biometrics', biometricRoute);
app.use('/api/biometricDevices', biometricDeviceRoute);
app.use('/api/buses', busRoute);
app.use('/api/castes', casteRoute);
app.use('/api/departments', departmentRoute);
app.use('/api/designations', designationRoute);
app.use('/api/employees', employeeRoute);
app.use('/api/employeeGrades', employeeGradeRoute);
app.use('/api/employeeTypes', employeeTypeRoute);
app.use('/api/holidays', holidayRoute);
app.use('/api/holidayPlans', holidayPlanRoute);
app.use('/api/leaveAllocation', leaveAllocationRoute);
app.use('/api/leaveTypes', leaveTypeRoute);
app.use('/api/leaves', leaveRoute);
app.use('/api/punches', punchRoute);
app.use('/api/religions', religionRoute);
app.use('/api/shifts', shiftRoute);
app.use('/api/users', userRoute);
app.use('/api/auth', authRoute);
app.use("/api/shiftAllocation", shiftAllocationRoutes);
app.use("/uploads", express.static("uploads"));


// Import models for Sequelize
require('./models/Attendance');
require('./models/BiometricDevice');
require('./models/Bus');
require('./models/Biometric');
require('./models/Caste');
require('./models/Department');
require('./models/Designation');
require('./models/Employee');
require('./models/EmployeeGrade');
require('./models/EmployeeType');
require('./models/Holiday');
require('./models/HolidayPlan');
require('./models/LeaveAllocation');
require('./models/Leave');
require('./models/LeaveType');
require('./models/Punch');
require('./models/Religion');
require('./models/Shift');
require('./models/User');

// ✅ Start server
const startServer = async () => {
  try {
    await seq.authenticate();
    console.log("✅ DB Connected successfully");

    // ⚠️ safer: alter = keep data, adjust schema if needed
    await seq.sync({ force:true});
    console.log("✅ Tables synced");

    app.listen(5000, () => {
      console.log("🚀 Listening at http://localhost:5000");
    });
    // // 🕛 Hourly biometric fetch
    // cron.schedule("* * * * *", async () => {
    //   try {
    //     console.log("🕛 Running hourly biometric fetch...");
    //     await fetchBiometrics();
    //   } catch (err) {
    //     console.error("❌ Error fetching biometrics:", err.message);
    //   }
    // });

    // // 🕛 Daily attendance processor at 12:00 AM
    // cron.schedule("* * * * *", async () => {
    //   try {
    //     console.log("🕛 Running daily attendance processor...");
    //     await processAttendance();
    //   } catch (err) {
    //     console.error("❌ Error processing attendance:", err.message);
    //   }
    // });

  } catch (error) {
    console.error("❌ Error starting server:", error.message);
  }
};

startServer();