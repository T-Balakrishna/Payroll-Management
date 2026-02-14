import db from '../models/index.js';
const { Permission } = db;
// Get all permissions
// In real usage: almost always filtered by staffId, companyId, permissionDate, etc.
export const getAllPermissions = async (req, res) => {
  try {
    const permissions = await Permission.findAll({
      include: [
        { model: db.Employee, as: 'employee' },
        { model: db.Company, as: 'company' },
        
      ]
    });
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single permission by ID
export const getPermissionById = async (req, res) => {
  try {
    const permission = await Permission.findByPk(req.params.id, {
      include: [
        { model: db.Employee, as: 'employee' },
        { model: db.Company, as: 'company' },
        
      ]
    });

    if (!permission) {
      return res.status(404).json({ message: 'Permission not found' });
    }

    res.json(permission);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new permission record
export const createPermission = async (req, res) => {
  try {
    const permission = await Permission.create(req.body);
    res.status(201).json(permission);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update permission
export const updatePermission = async (req, res) => {
  try {
    const [updated] = await Permission.update(req.body, {
      where: { permissionId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Permission not found' });
    }

    const permission = await Permission.findByPk(req.params.id);
    res.json(permission);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete permission (soft delete via paranoid: true)
export const deletePermission = async (req, res) => {
  try {
    const deleted = await Permission.destroy({
      where: { permissionId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Permission not found' });
    }

    res.json({ message: 'Permission deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};