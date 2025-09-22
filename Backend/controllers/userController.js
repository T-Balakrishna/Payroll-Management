const User = require('../models/User');
const Department = require('../models/Department')
const Employee = require('../models/Employee')
const bcrypt = require('bcryptjs');
const {Op} = require('sequelize')


// Create a new user
exports.createUser = async (req, res) => {
  try {
    const { userMail, userName, userNumber, role, departmentId, password, createdBy } = req.body;

    const existing = await User.findOne({ where: { userMail } });
    if (existing) return res.status(400).json({ error: "User already exists" });

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);
    // const { departmentId, ...rest } = req.body;
    // if(departmentId==''){
      
    // }
    const newUser = await User.create({
      userMail,
      userName,
      userNumber,
      role,
      departmentId,
      password: hashedPassword,
      createdBy
    });

    const newEmployee = await Employee.create({
      employeeMail :userMail,
      employeeName:userName,
      employeeNumber:userNumber,
      departmentId:departmentId,
      password: hashedPassword,
      createdBy
    });

    res.status(201).json({ message: "User & Employee created", user: newUser , employee : newEmployee});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({where:{status:'active'}});
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { userNumber } = req.params;
    const { password, updatedBy } = req.body;
  

    // Update user first
    const [updated] = await User.update(req.body, { where: { userNumber } });
    if (!updated) return res.status(404).json({ error: "User not found" });

    const updatedUser = await User.findOne({ where: { userNumber } });

    // 🔑 Only check password change
    if (password) {
      const isSamePassword = await bcrypt.compare(password, updatedUser.password);

      if (!isSamePassword) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await updatedUser.update({ password: hashedPassword, updatedBy });

        // 🔄 Also update Employee table
        const employee = await Employee.findOne({ where: { employeeNumber: updatedUser.userNumber } });
        if (employee) {
          await employee.update({ password: hashedPassword, updatedBy });
        }
      }
    }

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    await user.update({ status: 'inactive', updatedBy: req.body.updatedBy });
    const employee = await Employee.findOne({where:{employeeNumber : user.userNumber}});
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    await employee.update({ status: 'inactive', updatedBy: req.body.updatedBy });
    res.json({ message: "Employee deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getLastEmpNumber = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const {role} = req.body;

    // Find the department to get its acronym/prefix
    const dept = await Department.findByPk(departmentId);
    if (!dept) return res.status(404).json({ message: "Department not found" });

    const deptPrefix = dept.departmentAckr
    var lastEmp=''
    // Find the latest employee in this department by empNumber
    if(role==='Department Admin'){
       lastEmp = await User.findOne({
        where: { departmentId ,userNumber: {
        [Op.like]: `AD%`,   // ✅ only numbers starting with AD
      },/*check if this starts with AD*/},
        order: [["createdAt", "DESC"]],
      });
    }
    else{
       lastEmp = await User.findOne({
        where: { departmentId },
        order: [["createdAt", "DESC"]],
      });
    }
    console.log(lastEmp)
    let nextNumber;
    // console.log(lastEmp.userNumber.startsWith(`${deptPrefix}`)+" "+lastEmp.userNumber.startsWith(`AD${deptPrefix}`)+" "+lastEmp.userNumber.startsWith(`AD`)+" "+req.body.data);    
    if (lastEmp && (lastEmp.userNumber.startsWith(`${deptPrefix}`) || lastEmp.userNumber.startsWith(`AD${deptPrefix}`) || lastEmp.userNumber.startsWith(`AD`))) {
      // Extract the numeric part
      const lastNum = parseInt(lastEmp.userNumber.replace(/\D/g, ""), 10);
      if(role=="Staff")
        nextNumber = `${deptPrefix}${lastNum + 1}`;
      else if(role=="Admin")
        nextNumber = `AD${lastNum + 1}`;
      else
        nextNumber = `AD${deptPrefix}${lastNum + 1}`;


    } else {
      // First employee in this department
      if(role=="Staff")
        nextNumber = `${deptPrefix}1`;
      else if(role=="Admin")
        nextNumber = `AD1`;
      else
        nextNumber = `AD${deptPrefix}1`;
    }
    console.log(nextNumber);  
    res.json({ lastEmpNumber: nextNumber,message:lastEmp,dept:deptPrefix });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


exports.updatePassword = async (req, res) => {
  try {
    const { userNumber } = req.params; // linked to employeeNumber
    const { password, updatedBy } = req.body;

    if (!password) return res.status(400).json({ error: "Password is required" });

    const user = await User.findOne({ where: { userNumber } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await user.update({ password: hashedPassword, updatedBy });

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
