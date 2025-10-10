const {
  Employee,
  Department,
  Designation,
  EmployeeGrade,
  EmployeeType,
  Shift,
  Religion,
  Caste,
  Bus,
  User
} = require('../models'); // This pulls from index.js where associations are defined
const { log } = require('node-zklib/helpers/errorLog');
const { Op } = require('sequelize');
const bcrypt = require("bcrypt");
const UserController = require("./userController");

// ================= CRUD =================
// ✅ Create Employee
exports.createEmployee = async (req, res) => {
  try {
    console.log(req.body);
    const employee = await Employee.create(req.body);
    res.status(201).json(employee);
  } catch (error) {
    console.error("❌ Error in createEmployee:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    res.status(500).json({ error: "Failed to create employee", details: error.message });
  }
};

// ✅ Get all Employees with associations (referencePersonDetails removed as it's a string)
exports.getEmployees = async (req, res) => {
  try {
    const { companyId } = req.query;

    // Debug log (remove after testing)
    console.log('Association check:', !!Employee.associations.department ? 'OK' : 'MISSING');

    const whereClause = companyId ? { companyId: parseInt(companyId) } : {};  // Direct filter on Employee.companyId

    const employees = await Employee.findAll({
      where: whereClause,
      attributes: [
        'employeeId', 'employeeNumber', 'firstName', 'lastName', 'employeeMail',
        'salutation', 'gender', 'DOB', 'DOJ', 'departmentId', 'designationId',
        'reportsTo', 'referencePerson', 'photo', 'status', 'companyId'
      ],
      include: [
        { model: Department, as: 'department', required: false },
        { model: Designation, as: 'designation', required: false },
        { model: EmployeeGrade, as: 'grade', required: false },
        { model: Shift, as: 'shift', required: false },
        { model: Religion, as: 'religion', required: false },
        { model: Caste, as: 'caste', required: false },
        { model: Bus, as: 'bus', required: false },
        { model: Employee, as: 'manager', required: false },
      ],
    });
    res.json(employees);
  } catch (error) {
    console.error("❌ Error in getEmployees:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    res.status(500).json({ error: "Failed to fetch employees", details: error.message });
  }
};
// ✅ Get Employee by ID (referencePersonDetails removed as it's a string) 
exports.getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Employee ID is required" });
    }

    const employee = await Employee.findByPk(id, {
      include: [
        { model: Department, as: 'department', required: false },
        { model: Designation, as: 'designation', required: false },
        { model: EmployeeGrade, as: 'grade', required: false },
        { model: Shift, as: 'shift', required: false },
        { model: Religion, as: 'religion', required: false },
        { model: Caste, as: 'caste', required: false },
        { model: Bus, as: 'bus', required: false },
        { model: Employee, as: 'manager', required: false },
        // referencePersonDetails removed: referencePerson is a STRING, not a foreign key
      ],
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    res.json(employee);
  } catch (error) {
    console.error("❌ Error in getEmployeeById:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    res.status(500).json({ error: "Failed to fetch employee", details: error.message });
  }
};

// ✅ Update Employee
exports.updateEmployee = async (req, res) => {
  try {
    const { employeeNumber } = req.params;
    const { password, updatedBy } = req.body;

    if (!employeeNumber) {
      return res.status(400).json({ error: "Employee number is required" });
    }

    // Update employee
    const [updated] = await Employee.update(req.body, { where: { employeeNumber } });
    if (!updated) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const updatedEmployee = await Employee.findOne({ where: { employeeNumber } });

    // 🔑 Only check password change
    if (password) {
      const user = await User.findOne({ where: { userNumber: employeeNumber } });
      if (user) {
        const isSamePassword = await bcrypt.compare(password, user.password);
        if (!isSamePassword) {
          const hashedPassword = await bcrypt.hash(password, 10);
          await user.update({ password: hashedPassword, updatedBy });
          await updatedEmployee.update({ password: hashedPassword, updatedBy });
        }
      } else {
        console.warn(`User not found for employeeNumber: ${employeeNumber}`);
      }
    }

    res.json(updatedEmployee);
  } catch (error) {
    console.error("❌ Error in updateEmployee:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    res.status(500).json({ error: "Failed to update employee", details: error.message });
  }
};

// ✅ Delete Employee (Soft delete)
exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { updatedBy } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Employee ID is required" });
    }

    const employee = await Employee.findOne({ where: { employeeId: id } });
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Soft delete: set status to 'inactive'
    await employee.update({ status: 'inactive', updatedBy });
    res.json({ message: "Employee deactivated successfully" });
  } catch (error) {
    console.error("❌ Error deactivating employee:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    res.status(500).json({ error: "Failed to deactivate employee", details: error.message });
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
      // Associations commented out for performance; add if needed
    });

    if (!employees || employees.length === 0) {
      return res.status(404).json({ error: "No employees found for these departments" });
    }

    console.log(employees);
    res.json(employees);
  } catch (error) {
    console.error("❌ Error fetching employees by department:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    res.status(500).json({ error: "Failed to fetch employees", details: error.message });
  }
};

exports.getEmployeeFromUser = async (req, res) => {
  try {
    const { userNumber } = req.params;
    console.log("Hello this new controller" + userNumber);
    if (!userNumber) {
      return res.status(400).json({ error: "Missing userNumber" });
    }

    const user = await User.findOne({ where: { userNumber } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      employeeMail: user.userMail,
      employeeNumber: user.userNumber,
      password: user.password,
      departmentId: user.departmentId, // adjust based on your column name
    });
  } catch (err) {
    console.error("❌ Error in getEmployeeFromUser:", {
      message: err.message,
      stack: err.stack,
      name: err.name,
    });
    res.status(500).json({ error: "Failed to fetch employee from user", details: err.message });
  }
};

exports.getEmployeeName = async (req, res) => {
  try {
    const { userNumber } = req.params;
    console.log(userNumber);
    if (!userNumber) {
      return res.status(400).json({ error: "User number is required" });
    }

    const employee = await Employee.findOne({
      where: { employeeNumber: userNumber },
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee Name not found" });
    }

    res.json({
      employeeName: `${employee.firstName} ${employee.lastName}`.trim()
    });
  } catch (error) {
    console.error("❌ Error in getEmployeeName:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    res.status(500).json({ error: "Failed to fetch employee name", details: error.message });
  }
};

// GET /api/employees/full/:employeeNumber
exports.getEmployeeFullByNumber = async (req, res) => {
  try {
    const { employeeNumber } = req.params;
    if (!employeeNumber) {
      return res.status(400).json({ error: "Employee number is required" });
    }

    const employee = await Employee.findOne({
      where: { employeeNumber },
      include: [
        { model: Department, as: "department", required: false },
        { model: Designation, as: "designation", required: false },
        { model: EmployeeGrade, as: "grade", required: false },
        { model: Shift, as: "shift", required: false },
        { model: Religion, as: "religion", required: false },
        { model: Caste, as: "caste", required: false },
        { model: Bus, as: "bus", required: false },
        // referencePersonDetails removed: referencePerson is a STRING, not a foreign key
      ],
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    res.json(employee); // send entire employee object
  } catch (err) {
    console.error("❌ Error in getEmployeeFullByNumber:", {
      message: err.message,
      stack: err.stack,
      name: err.name,
    });
    res.status(500).json({ error: "Failed to fetch full employee", details: err.message });
  }
};

exports.uploadPhoto = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Employee ID is required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log('Uploaded file:', req.file); // Debug log
    const employee = await Employee.findByPk(id);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Save correct path
    employee.photo = `/uploads/${req.file.filename}`; // Changed from /Uploads/employees/
    await employee.save();

    res.json({ message: "Photo uploaded successfully", employee });
  } catch (error) {
    console.error("❌ Error in uploadPhoto:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    res.status(500).json({ error: "Failed to upload photo", details: error.message });
  }
};

exports.getEmployeeByBiometric = async (req, res) => {
  try {
    const { biometricNumber } = req.params;
    const employee = await Employee.findOne({
      where: { biometricNumber },
      attributes: ["employeeNumber", "departmentId"]
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json(employee);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};