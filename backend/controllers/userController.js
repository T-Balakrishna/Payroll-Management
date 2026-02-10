const { User } = require('../models');

// Get all users
// In real usage: filter by companyId, role, status, departmentId, etc.
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      include: [
        { model: require('../models').Company, as: 'company' },
        { model: require('../models').Department, as: 'department' },
        { model: require('../models').Role, as: 'role' },
        
      ]
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [
        { model: require('../models').Company, as: 'company' },
        { model: require('../models').Department, as: 'department' },
        { model: require('../models').Role, as: 'role' },
        
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new user
exports.createUser = async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const [updated] = await User.update(req.body, {
      where: { userId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = await User.findByPk(req.params.id);
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete user (soft delete via paranoid: true)
// Usually rare — prefer changing status to 'inactive'
exports.deleteUser = async (req, res) => {
  try {
    const deleted = await User.destroy({
      where: { userId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
