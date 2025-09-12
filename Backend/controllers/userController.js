const User = require('../models/User');
const Department = require('../models/Department')
const bcrypt = require('bcryptjs');

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

    res.status(201).json({ message: "User created", user: newUser });
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

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { userName, userNumber, role, departmentId, password } = req.body;

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // If password is provided, hash it
    let updatedData = { userName, userNumber, role, departmentId };
    if (password) {
      updatedData.password = await bcrypt.hash(password, 10);
    }

    await user.update(updatedData);
    res.json({ message: "User updated", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    await user.update({ status: 'inactive', updatedBy: req.body.updatedBy });
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getLastEmpNumber = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const {role} = req;

    // Find the department to get its acronym/prefix
    const dept = await Department.findByPk(departmentId);
    if (!dept) return res.status(404).json({ message: "Department not found" });

    const deptPrefix = dept.departmentAckr
    var lastEmp=''
    // Find the latest employee in this department by empNumber
    if(role==='Department Admin'){
       lastEmp = await User.findOne({
        where: { departmentId ,userNumber: {
        [Op.like]: "AD%",   // ✅ only numbers starting with AD
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

    let nextNumber;
    console.log(lastEmp);    
    if (lastEmp && (lastEmp.userNumber.startsWith(deptPrefix) || lastEmp.userNumber.startsWith(`AD${deptPrefix}`))) {
      // Extract the numeric part
      const lastNum = parseInt(lastEmp.userNumber.replace(/\D/g, ""), 10);
      if(role=="Staff")
      nextNumber = `${deptPrefix}${lastNum + 1}`;
    } else {
      // First employee in this department
      nextNumber = `${deptPrefix}1`;
    }

    res.json({ lastEmpNumber: nextNumber });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};