const express = require('express');
const cors = require('cors');
const seq = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const busRoute = require('./routes/busRoute');
const casteRoute = require('./routes/casteRoute');
const departmentRoute = require('./routes/departmentRoute');
const designationRoute = require('./routes/designationRoute');
const empRoute = require('./routes/employeeRoute');
const employeeTypeRoute = require('./routes/employeeTypeRoute');
// const holidayRoute = require('./routes/holidayRoute');
// const holidayPlanRoute = require('./routes/holidayPlanRoute');
//const leaveRoute = require('./routes/leaveRoute');
// const loginRoute = require('./routes/loginRoute');
const religionRoute = require('./routes/religionRoute');
const shiftRoute = require('./routes/shiftRoute');
//const userRoute = require('./routes/userRoute');


// Map routes
app.use('/api/buses', busRoute);
app.use('/api/castes', casteRoute);
app.use('/api/departments', departmentRoute);
app.use('/api/designations', designationRoute);
app.use('/api/employees', empRoute);
app.use('/api/employeeTypes', employeeTypeRoute);
// app.use('/api/holidays', holidayRoute);
// app.use('/api/holidayPlans', holidayPlanRoute);
//app.use('/api/leaves', leaveRoute);
// app.use('/api/logins', loginRoute);
app.use('/api/religions', religionRoute);
app.use('/api/shifts', shiftRoute);
//app.use('/api/users', userRoute);

// Import models so Sequelize can sync tables
require('./models/Bus');
require('./models/Caste');
require('./models/Department');
require('./models/Designation');
require('./models/Employee');
require('./models/EmployeeType');
// require('./models/Holiday');
// require('./models/HolidayPlan');
// require('./models/Leave');
// require('./models/Login');
require('./models/Religion');
require('./models/Shift');
//require('./models/User');

// Start server
const startServer = async () => {
  try {
    await seq.authenticate();
    console.log("DB Connected successfully");

    await seq.sync({force:true});
    console.log("Tables created");

    app.listen(5000, () => {
      console.log("Listening at http://localhost:5000");
    });
  } catch (error) {
    console.log(error.message);
  }
};

startServer();
