const Employee = require('../models/Employee');
const Department = require('../models/Department');
const Designation = require('../models/Designation');
const EmployeeGrade = require('../models/EmployeeGrade');
const EmployeeType = require('../models/EmployeeType');
const Shift = require('../models/Shift');
const Religion = require('../models/Religion');
const Caste = require('../models/Caste');
const Bus = require('../models/Bus');
const User = require('../models/User')
const { log } = require('node-zklib/helpers/errorLog');
const {Op} = require('sequelize')

// ================= CRUD =================

// ✅ Create Employee
exports.createEmployee = async (req, res) => {
  try {    
    console.log(req.body);    
    const employee = await Employee.create(req.body);
    res.status(201).json(employee);
  } catch (error) {
    res.status(500).json({error: error.message });
  }
};

// ✅ Get all Employees with associations
exports.getEmployees = async (req, res) => {
  try {
    const employees = await Employee.findAll({
      include: [
        { model: Department, as: 'department' },
        { model: Designation, as: 'designation' },
        { model: EmployeeGrade, as: 'grade' },
        { model: Shift, as: 'shift' },
        { model: Religion, as: 'religion' },
        { model: Caste, as: 'caste' },
        { model: Bus, as: 'bus' },
        { model: Employee, as: 'manager' },
        { model: Employee, as: 'referencePersonDetails' },
      ],
    });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Get Employee by ID
exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id, {
      include: [
        { model: Department, as: 'department' },
        { model: Designation, as: 'designation' },
        { model: EmployeeGrade, as: 'grade' },
        { model: Shift, as: 'shift' },
        { model: Religion, as: 'religion' },
        { model: Caste, as: 'caste' },
        { model: Bus, as: 'bus' },
        { model: Employee, as: 'manager' },
        { model: Employee, as: 'referencePersonDetails' },
      ],
    });

    if (!employee) return res.status(404).json({ error: "Employee not found" });

    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Update Employee
exports.updateEmployee = async (req, res) => {
  try {
    const { employeeNumber } = req.params; // frontend sends this
    const [updated] = await Employee.update(req.body, {
      where: { employeeNumber }
    });

    if (!updated) return res.status(404).json({ error: "Employee not found" });

    const updatedEmployee = await Employee.findOne({where:{employeeNumber}});
    res.json(updatedEmployee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Delete Employee
exports.deleteEmployee = async (req, res) => {
  try {
    const deleted = await Employee.destroy({ where: { employeeId: req.params.id } });

    if (!deleted) return res.status(404).json({ error: "Employee not found" });

    res.json({ message: "Employee deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ================= EXTRA =================

// ✅ Get Employees by Department
exports.getEmployeesByDepartment = async (req, res) => {
  try {
    const { departments } = req.body; // array of departmentIds
    
    
    if (!departments || !Array.isArray(departments) || departments.length === 0) {
      return res.status(400).json({ error: "Departments array is required" });
    }

    console.log("Generated where clause:", { departmentId: { [Op.in]: departments } });
    const employees = await Employee.findAll({
      where: { departmentId: { [Op.in]: departments } },
      // include: [
      //   { model: Department, as: "department" },
      //   { model: Designation, as: "designation" },
      //   { model: EmployeeGrade, as: "grade" },
      //   { model: Shift, as: "shift" },
      //   { model: Religion, as: "religion" },
      //   { model: Caste, as: "caste" },
      //   { model: Bus, as: "bus" },
      //   { model: Employee, as: "manager" },
      //   { model: Employee, as: "referencePersonDetails" },
      // ],
    });

    if (!employees || employees.length === 0) {
      return res.status(404).json({ error: "No employees found for these departments" });
    }
    console.log(employees);
    
    res.json(employees);
  } catch (error) {
    console.error("❌ Error fetching employees:", error);
    res.status(500).json({ error: "hi"+error.message });
  }
};

exports.getEmployeeFromUser = async (req, res) => {
  
  try {
    const { userNumber } = req.params; // frontend sends this
    console.log("Hello this new controller"+ userNumber);
    if (!userNumber) return res.status(400).json({ error: "Missing userNumber" });

    const user = await User.findOne({ where: { userNumber } });
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      employeeMail: user.userMail,
      employeeNumber: user.userNumber,
      password: user.password,
      departmentId: user.departmentId, // adjust based on your column name
    });
  } catch (err) {
    console.error("❌ Error in /byUser:", err);
    res.status(500).json({ error: "Internal Server Errors" });
  }
}

exports.getEmployeeName = async (req, res) => {
  try {
    const { userNumber } = req.params;
    console.log(userNumber);    
    const employee = await Employee.findOne({
      where: { employeeNumber:userNumber },
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee Name not found" });
    }

    res.json({
      employeeName: `${employee.firstName} ${employee.lastName}`.trim()
    });
  } catch (error) {
    console.error("❌ Error in getEmployeeName:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// GET /api/employees/full/:employeeNumber
exports.getEmployeeFullByNumber = async (req, res) => {
  try {
    const { employeeNumber } = req.params;
    const employee = await Employee.findOne({
      where: { employeeNumber },
      include: [
        { model: Department, as: "department" },
        { model: Designation, as: "designation" },
        { model: EmployeeGrade, as: "grade" },
        { model: Shift, as: "shift" },
        { model: Religion, as: "religion" },
        { model: Caste, as: "caste" },
        { model: Bus, as: "bus" },
      ],
    });

    if (!employee) return res.status(404).json({ error: "Employee not found" });

    res.json(employee); // send entire employee object
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

