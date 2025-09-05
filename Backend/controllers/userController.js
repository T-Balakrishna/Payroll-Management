const User = require('../models/User'); // Sequelize model

// Create
exports.createUser = async (req, res) => {
  try {
    const { userMail , userNumber, role, departmentId, password, createdBy } = req.body;
    const newUser = await User.create({
      userMail,      
      userNumber,
      role,
      departmentId,
      password,
      createdBy
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error("❌ Error creating user:", error);
    res.status(500).send("Error creating user: " + error.message);
  }
};

// Read All (only active)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({ where: { status: 'active' } });
    res.json(users);
  } catch (error) {
    res.status(500).send("Error fetching users: " + error.message);
  }
};

// Read One by ID (only active)
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findOne({ where: { userId: req.params.id, status: 'active' } });
    if (!user) return res.status(404).send("User not found or inactive");
    res.json(user);
  } catch (error) {
    res.status(500).send("Error fetching user: " + error.message);
  }
};

// Update
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findOne({ where: { userId: req.params.id, status: 'active' } });
    if (!user) return res.status(404).send("User not found or inactive");

    await user.update({ ...req.body, updatedBy: req.body.updatedBy });
    res.json(user);
  } catch (error) {
    console.error("❌ Error updating user:", error);
    res.status(500).send("Error updating user: " + error.message);
  }
};

// Soft Delete (set status to inactive)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findOne({ where: { userId: req.params.id, status: 'active' } });
    if (!user) return res.status(404).send("User not found or already inactive");

    await user.update({ status: 'inactive', updatedBy: req.body.updatedBy });
    res.json({ message: "User deactivated successfully" });
  } catch (error) {
    res.status(500).send("Error deleting user: " + error.message);
  }
};
