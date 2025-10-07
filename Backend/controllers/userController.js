const User = require('../models/User');
const Department = require('../models/Department');
const Employee = require('../models/Employee');
const Company = require('../models/Company');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');


// ------------------ CREATE USER ------------------
exports.createUser = async (req, res) => {
  try {
    const { userMail, userName, userNumber, role, departmentId, companyId, password, createdBy,biometricNumber } = req.body;

    const existing = await User.findOne({ where: { userMail } });
    if (existing) return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      userMail,
      userName,
      userNumber,
      role,
      departmentId,
      companyId,
      password: hashedPassword,
      createdBy,
      biometricNumber
    });

    if(role==="Staff"){

        await Employee.create({
          employeeMail: userMail,
          employeeName: userName,
          employeeNumber: userNumber,
          departmentId,
          companyId,
          password: hashedPassword,
          createdBy,
          biometricNumber
        });
    }

    res.status(201).json({ message: "User & Employee created", user: newUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ------------------ GET ALL USERS ------------------
exports.getAllUsers = async (req, res) => {
  try {
    const { companyId, departmentId } = req.query; // optional filters

    const filter = { status: 'active' };
    if (companyId) filter.companyId = companyId;
    if (departmentId) filter.departmentId = departmentId;

    const users = await User.findAll({ where: filter });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ------------------ GET USER BY ID ------------------
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({role:user.role,departmentId:user.departmentId});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUserByNumber = async (req, res) => {
  try {
    const userNumber=req.params.userNumber;
    // console.log("hi");
    
    const user = await User.findOne({where:{userNumber}});
    if (!user) return res.status(404).json({ error: "User hell not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ------------------ UPDATE USER ------------------
exports.updateUser = async (req, res) => {
  try {
    const { userNumber } = req.params;
    const { password, updatedBy } = req.body;

    const [updated] = await User.update(req.body, { where: { userNumber } });
    if (!updated) return res.status(404).json({ error: "User not found" });

    const updatedUser = await User.findOne({ where: { userNumber } });

    if (password) {
      const isSamePassword = await bcrypt.compare(password, updatedUser.password);
      if (!isSamePassword) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await updatedUser.update({ password: hashedPassword, updatedBy });

        const employee = await Employee.findOne({ where: { employeeNumber: userNumber } });
        if (employee) await employee.update({ password: hashedPassword, updatedBy });
      }
    }

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ------------------ DELETE USER ------------------
exports.deleteUser = async (req, res) => {
  try {
    const { userNumber } = req.params;
    const { updatedBy } = req.body;
    // console.log(userNumber,updatedBy);
    
    const user = await User.findOne({ where: { userNumber } });
    if (!user) return res.status(404).json({ error: "User not found" });

    await user.update({ status: 'inactive', updatedBy });

    const employee = await Employee.findOne({ where: { employeeNumber: userNumber } });
    if (employee) await employee.update({ status: 'inactive', updatedBy });

    res.json({ message: "User & Employee marked inactive" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ------------------ GET LAST EMPLOYEE NUMBER ------------------

// Generate next user number with uniqueness check
exports.getLastEmpNumber = async (req, res) => {
  try {
    const { role, companyId, departmentId } = req.body;
    // console.log( role, companyId, departmentId);
    let prefix = "";
    let filter = {};

    // Handle role-specific filters
    if (role === "Super Admin") {
      prefix = "SAD_";
      filter = { role: "Super Admin" };
    } 
    else if (role === "Admin") {
      prefix = `AD${companyId}_`;
      filter = { role: "Admin", companyId };
    }
     else if (role === "Department Admin") {
      const dept = await Department.findByPk(departmentId);
      if (!dept) return res.status(404).json({ message: "Department not found" });
      prefix = `${dept.departmentAckr}AD${companyId}_`;
      filter = { role: "Department Admin", companyId, departmentId };
    } 
    else if (role === "Staff") {
      const dept = await Department.findByPk(departmentId);
      if (!dept) return res.status(404).json({ message: "Department not found" });
      prefix = `${dept.departmentAckr}${companyId}_`;
      filter = { role: "Staff", companyId, departmentId };
    } 
    else {
      return res.status(400).json({ message: "Invalid role" });
    }

    // Find the last user matching the filter
    const lastUser = await User.findOne({
      where: {
        ...filter,
        userNumber: { [Op.like]: `${prefix}%` },
      },
      order: [["createdAt", "DESC"]],
    });

    let nextNum = 1;

    if (lastUser) {
      const parts = lastUser.userNumber.split("_");  // split by underscore
      const lastNum = parseInt(parts[1], 10);        // convert second part to int
      nextNum = lastNum + 1;
      // console.log(parts,lastNum,nextNum);
    }


    let newUserNumber = `${prefix}${nextNum}`;

    // Ensure uniqueness: increment until number not present
    let exists = await User.findOne({ where: { userNumber: newUserNumber } });
    while (exists) {
      nextNum++;
      newUserNumber = `${prefix}${nextNum}`;
      exists = await User.findOne({ where: { userNumber: newUserNumber } });
    }

    res.json({ lastEmpNumber: newUserNumber });
  } catch (err) {
    // console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


// ------------------ UPDATE PASSWORD ------------------
exports.updatePassword = async (req, res) => {
  try {
    const { userNumber } = req.params;
    const { password, updatedBy } = req.body;

    if (!password) return res.status(400).json({ error: "Password is required" });

    const user = await User.findOne({ where: { userNumber } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await user.update({ password: hashedPassword, updatedBy });

    const employee = await Employee.findOne({ where: { employeeNumber: userNumber } });
    if (employee) await employee.update({ password: hashedPassword, updatedBy });

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ------------------ GET COMPANY ID ------------------
exports.getCompanyId = async (req, res) => {
  try {
    const { userNumber } = req.params;
    const user = await User.findOne({ where: { userNumber } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const company = await Company.findOne({ where: { companyId: user.companyId } });
    res.status(200).json({ companyId: user.companyId, companyName: company.companyName });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
