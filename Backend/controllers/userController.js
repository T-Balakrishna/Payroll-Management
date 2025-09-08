const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Create a new user
exports.createUser = async (req, res) => {
  try {
<<<<<<< Updated upstream
    const { userMail , userNumber, role, departmentId, password, createdBy } = req.body;
=======
    const { userMail, userName, userNumber, role, departmentId, password, createdBy } = req.body;

    const existing = await User.findOne({ where: { userMail } });
    if (existing) return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

>>>>>>> Stashed changes
    const newUser = await User.create({
      userMail,      
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
    const users = await User.findAll();
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
    const { userName, userNumber, role, departmentId } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    await user.update({ userName, userNumber, role, departmentId });
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

    await user.destroy();
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Normal login
exports.loginUser = async (req, res) => {
  try {
    const { userMail, password } = req.body;
    const user = await User.findOne({ where: { userMail, status: 'active' } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.userId, role: user.role }, "mySecretKey", { expiresIn: "1h" });
    res.json({ message: "Login success", token, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Google OAuth login
exports.googleLogin = async (req, res) => {
  try {
    const { email, name } = req.body; 
    if (!email) return res.status(400).json({ error: "Email is required" });

    let user = await User.findOne({ where: { userMail: email } });

    if (!user) {
      user = await User.create({
        userMail: email,
        userName: name || email.split('@')[0],
        userNumber: "0000",
        role: "User",
        departmentId: 1,
        password: await bcrypt.hash("googleAuth", 10),
        createdBy: "GoogleOAuth"
      });
    }

    const token = jwt.sign({ id: user.userId, role: user.role }, "mySecretKey", { expiresIn: "1h" });
    res.json({ message: "Google login success", token, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
