const { Role } = require('../models');

// Get all roles
exports.getAllRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({
      include: [
        
        // { model: require('../models').User, as: 'users' }   // ← only include if needed (can be heavy)
      ]
    });
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single role by ID
exports.getRoleById = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id, {
      include: [
        
        // { model: require('../models').User, as: 'users' }
      ]
    });

    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    res.json(role);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new role
exports.createRole = async (req, res) => {
  try {
    const role = await Role.create(req.body);
    res.status(201).json(role);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update role
exports.updateRole = async (req, res) => {
  try {
    const [updated] = await Role.update(req.body, {
      where: { roleId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Role not found' });
    }

    const role = await Role.findByPk(req.params.id);
    res.json(role);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete role (soft delete supported via paranoid: true)
exports.deleteRole = async (req, res) => {
  try {
    const deleted = await Role.destroy({
      where: { roleId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Role not found' });
    }

    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
