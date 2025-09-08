const express = require('express');
const cors = require('cors');
const helmet = require('helmet');   // ✅ add helmet
const morgan = require('morgan');   // ✅ add morgan
const seq = require('./config/db');

const app = express();

// ✅ Add Helmet for security headers
app.use(helmet());

// ✅ Add request logging
app.use(morgan('dev'));

// ✅ Add CORS for frontend and allow credentials
app.use(cors({
  origin: "http://localhost:5173", // your React frontend
  credentials: true,
}));

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
<<<<<<< Updated upstream
const holidayRoute = require('./routes/holidayRoute');
const holidayPlanRoute = require('./routes/holidayPlanRoute');
const leavePolicyRoute = require('./routes/leavePolicyRoute');
const leaveRequestRoute = require('./routes/leaveRequestRoute');
=======
// const holidayRoute = require('./routes/holidayRoute');
// const holidayPlanRoute = require('./routes/holidayPlanRoute');
// const leaveRoute = require('./routes/leaveRoute');
>>>>>>> Stashed changes
// const loginRoute = require('./routes/loginRoute');
const punchRoute = require('./routes/punchRoute');
const religionRoute = require('./routes/religionRoute');
const shiftRoute = require('./routes/shiftRoute');
<<<<<<< Updated upstream
const userRoute = require('./routes/userRoute');

=======
const userRoute = require('./routes/userRoute');   // ✅ added
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
app.use('/api/holidays', holidayRoute);
app.use('/api/holidayPlans', holidayPlanRoute);
app.use('/api/leaveRequests', leaveRequestRoute);
app.use('/api/leavePolicies', leavePolicyRoute);
=======
// app.use('/api/holidays', holidayRoute);
// app.use('/api/holidayPlans', holidayPlanRoute);
// app.use('/api/leaves', leaveRoute);
>>>>>>> Stashed changes
// app.use('/api/logins', loginRoute);
app.use('/api/punches', punchRoute);
app.use('/api/religions', religionRoute);
app.use('/api/shifts', shiftRoute);
<<<<<<< Updated upstream
app.use('/api/users', userRoute);
=======
app.use('/api/users', userRoute);   // ✅ expose users
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
require('./models/User');
=======
require('./models/User');   // ✅ user model
>>>>>>> Stashed changes

// Start server
const startServer = async () => {
  try {
    await seq.authenticate();
    console.log("✅ DB Connected successfully");

<<<<<<< Updated upstream
    await seq.sync({force:false});
    console.log("Tables created");
=======
    // ⚠️ safer: alter = keep data, adjust schema if needed
    await seq.sync({ alter: true });
    console.log("✅ Tables synced");
>>>>>>> Stashed changes

    app.listen(5000, () => {
      console.log("🚀 Listening at http://localhost:5000");
    });
  } catch (error) {
    console.log("❌ Error starting server:", error.message);
  }
};

startServer();
