const express = require('express');
const cors = require('cors');
const seq = require('./config/db');
const cron = require("node-cron");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const attendanceRoute = require('./routes/attendanceRoute');
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
const leavePolicyRoute = require('./routes/leavePolicyRoute');
const leaveRequestRoute = require('./routes/leaveRequestRoute');
// const loginRoute = require('./routes/loginRoute');
const punchRoute = require('./routes/punchRoute');
const religionRoute = require('./routes/religionRoute');
const shiftRoute = require('./routes/shiftRoute');
const userRoute = require('./routes/userRoute');


// Map routes
app.use('/api/attendance', attendanceRoute);
app.use('/api/biometric', biometricDeviceRoute);
app.use('/api/buses', busRoute);
app.use('/api/castes', casteRoute);
app.use('/api/departments', departmentRoute);
app.use('/api/designations', designationRoute);
app.use('/api/employees', employeeRoute);
app.use('/api/employeeGrades', employeeGradeRoute);
app.use('/api/employeeTypes', employeeTypeRoute);
app.use('/api/holidays', holidayRoute);
app.use('/api/holidayPlans', holidayPlanRoute);
app.use('/api/leaveRequests', leaveRequestRoute);
app.use('/api/leavePolicies', leavePolicyRoute);
// app.use('/api/logins', loginRoute);
app.use('/api/punches', punchRoute);
app.use('/api/religions', religionRoute);
app.use('/api/shifts', shiftRoute);
app.use('/api/users', userRoute);

// Import models so Sequelize can sync tables

require('./models/Attendance');
require('./models/BiometricDevice');
require('./models/Bus');
require('./models/Caste');
require('./models/Department');
require('./models/Designation');
require('./models/Employee');
require('./models/EmployeeGrade');
require('./models/EmployeeType');
require('./models/Holiday');
require('./models/HolidayPlan');
require('./models/LeavePolicy');
require('./models/LeavePolicyDetails');
require('./models/LeaveRequest');
require('./models/LeaveType');
require('./models/Punch');
// require('./models/Login');
require('./models/Religion');
require('./models/Shift');
require('./models/User');

// Start server
const startServer = async () => {
  try {
    await seq.authenticate();
    console.log("DB Connected successfully");

    await seq.sync({force:false});
    console.log("Tables created");

    app.listen(5000, () => {
      console.log("Listening at http://localhost:5000");
    });

    cron.schedule("* * * * *", async () => {
      try {
        await axios.get("http://localhost:5000/api/punches/");
        console.log("✅ Punches fetched (every 1 hour)");
      } catch (err) {
        console.error("❌ Error in cron job:", err.message);
      }
    });
  } catch (error) {
    console.log(error.message);
  }
};

startServer();
