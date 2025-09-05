const Employee = require('../models/Employee');
const Department = require('../models/Department');
const Designation = require('../models/Designation');
const EmployeeGrade = require('../models/EmployeeGrade');
const EmployeeType = require('../models/EmployeeType');
const Shift = require('../models/Shift');
const LeavePolicy = require('../models/LeavePolicy');
const Religion = require('../models/Religion');
const Caste = require('../models/Caste');

// ================= CREATE EMPLOYEE =================
exports.createEmployee = async (req, res) => {
  try {
    const {
      salutation, firstName, middleName, lastName, gender, DOB, DOJ,
      doorNumber, streetName, city, district, state, pincode,
      designationId, employeeGradeId, reportsTo, departmentId, employeeTypeId, employeeNumber,
      biometricId, holidayListPolicyId, leavePolicyId, shiftId,
      maritalStatus, bloodGroup, religionId, casteId, aadharNumber, passportNumber,
      costToCompany, salaryCurrency, salaryMode, payrollCostCenter, panNumber,
      providentFundAccount, pfNominee, asiNumber, uanNumber,
      resignationLetterDate, relievingDate, exitInterviewHeldOn,
      createdBy, updatedBy
    } = req.body;

    const photo = req.file ? req.file.buffer : null; // assuming multer middleware for file upload

    const newEmployee = await Employee.create({
      salutation, firstName, middleName, lastName, gender, DOB, DOJ,
      doorNumber, streetName, city, district, state, pincode,
      designationId, employeeGradeId, reportsTo, departmentId, employeeTypeId, employeeNumber,
      biometricId, holidayListPolicyId, leavePolicyId, shiftId,
      maritalStatus, bloodGroup, religionId, casteId, aadharNumber, passportNumber,
      costToCompany, salaryCurrency, salaryMode, payrollCostCenter, panNumber,
      providentFundAccount, pfNominee, asiNumber, uanNumber,
      resignationLetterDate, relievingDate, exitInterviewHeldOn,
      photo, createdBy, updatedBy
    });

    res.status(201).json(newEmployee);
  } catch (error) {
    console.error("❌ Error creating employee:", error);
    res.status(500).send("Error creating employee: " + error.message);
  }
};

// ================= READ ALL EMPLOYEES =================
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.findAll({
      include: [
        { model: Department, as: 'department' },
        { model: Designation, as: 'designation' },
        { model: EmployeeGrade, as: 'grade' },
        { model: Shift, as: 'shift' },
        { model: LeavePolicy, as: 'leavePolicy' },
        { model: Religion, as: 'religion' },
        { model: Caste, as: 'caste' },
        { model: Employee, as: 'manager' }
      ]
    });
    res.json(employees);
  } catch (error) {
    console.error("❌ Error fetching employees:", error);
    res.status(500).send("Error fetching employees: " + error.message);
  }
};

// ================= READ EMPLOYEE BY ID =================
exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findOne({
      where: { employeeId: req.params.id },
      include: [
        { model: Department, as: 'department' },
        { model: Designation, as: 'designation' },
        { model: EmployeeGrade, as: 'grade' },
        { model: Shift, as: 'shift' },
        { model: LeavePolicy, as: 'leavePolicy' },
        { model: Religion, as: 'religion' },
        { model: Caste, as: 'caste' },
        { model: Employee, as: 'manager' }
      ]
    });

    if (!employee) return res.status(404).send("Employee not found");
    res.json(employee);
  } catch (error) {
    console.error("❌ Error fetching employee:", error);
    res.status(500).send("Error fetching employee: " + error.message);
  }
};

// ================= UPDATE EMPLOYEE =================
exports.updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOne({ where: { employeeId: req.params.id } });
    if (!employee) return res.status(404).send("Employee not found");

    const updatedData = { ...req.body };
    if (req.file) updatedData.photo = req.file.buffer; // update photo if uploaded

    await employee.update(updatedData);
    res.json(employee);
  } catch (error) {
    console.error("❌ Error updating employee:", error);
    res.status(500).send("Error updating employee: " + error.message);
  }
};

// ================= DELETE EMPLOYEE =================
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOne({ where: { employeeId: req.params.id } });
    if (!employee) return res.status(404).send("Employee not found");

    // Soft delete: set status to 'inactive'
    await employee.update({ status: 'inactive', updatedBy: req.body.updatedBy });
    res.json({ message: "Employee deactivated successfully" });
  } catch (error) {
    console.error("❌ Error deactivating employee:", error);
    res.status(500).send("Error deactivating employee: " + error.message);
  }
};