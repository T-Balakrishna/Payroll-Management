const db = require('../models');
const bcrypt = require('bcryptjs');
const { User, Role, StudentDetails, Employee } = db;

const normalizeRoleName = (value = '') => value.toLowerCase().replace(/[\s-]/g, '');
const STAFF_ROLE_KEYS = new Set(['teachingstaff', 'nonteachingstaff']);

const splitNameParts = (fullName = '') => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { firstName: parts[0] || '', lastName: '' };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
};

// Get all users
// In real usage: filter by companyId, role, status, departmentId, etc.
exports.getAllUsers = async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive || '').toLowerCase() === 'true';
    const users = await User.findAll({
      where: includeInactive ? {} : { status: 'Active' },
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
  const transaction = await db.sequelize.transaction();
  try {
    if (!req.body.password) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Password is required' });
    }

    const role = await Role.findByPk(req.body.roleId, { transaction });
    if (!role) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Invalid roleId' });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const userPayload = {
      ...req.body,
      password: hashedPassword,
    };

    const user = await User.create(userPayload, { transaction });
    const normalizedRole = normalizeRoleName(role.roleName);

    if (normalizedRole === 'student') {
      await StudentDetails.create({
        studentName: user.userName || user.userNumber,
        registerNumber: user.userNumber,
        departmentId: user.departmentId || null,
        createdBy: user.createdBy || null,
        updatedBy: user.updatedBy || null,
      }, { transaction });
    }

    if (STAFF_ROLE_KEYS.has(normalizedRole)) {
      const { firstName, lastName } = splitNameParts(user.userName || user.userNumber);

      await Employee.create({
        staffNumber: user.userNumber,
        departmentId: user.departmentId || 1,
        firstName: firstName || user.userNumber,
        lastName: lastName || null,
        personalEmail: user.userMail,
        officialEmail: user.userMail,
        dateOfJoining: new Date(),
        createdBy: user.createdBy || null,
        updatedBy: user.updatedBy || null,
      }, { transaction });
    }

    await transaction.commit();
    res.status(201).json(user);
  } catch (error) {
    await transaction.rollback();
    res.status(400).json({ error: error.message });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const payload = { ...req.body };

    if (typeof payload.password === 'string') {
      if (payload.password.trim()) {
        payload.password = await bcrypt.hash(payload.password, 10);
      } else {
        delete payload.password;
      }
    }

    const [updated] = await User.update(payload, {
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
  const transaction = await db.sequelize.transaction();
  try {
    const user = await User.findByPk(req.params.id, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ message: 'User not found' });
    }

    // Soft delete staff rows: mark inactive and then paranoid delete.
    await Employee.update(
      { status: 'Inactive', updatedBy: req.body?.updatedBy || user.updatedBy || null },
      { where: { staffNumber: user.userNumber }, transaction }
    );
    await Employee.destroy({
      where: { staffNumber: user.userNumber },
      transaction,
    });

    // Soft delete student rows using existing JSON/meta fields.
    const students = await StudentDetails.findAll({
      where: { registerNumber: user.userNumber },
      transaction,
    });
    for (const student of students) {
      const existingMessages = student.messages && typeof student.messages === 'object'
        ? student.messages
        : {};
      await student.update(
        {
          pending: true,
          updatedBy: req.body?.updatedBy || user.updatedBy || null,
          messages: {
            ...existingMessages,
            softDeleted: true,
            softDeletedAt: new Date().toISOString(),
          },
        },
        { transaction }
      );
    }

    // Soft delete user by status change.
    const [updatedUsers] = await User.update(
      { status: 'Inactive', updatedBy: req.body?.updatedBy || user.updatedBy || null },
      { where: { userId: req.params.id }, transaction }
    );
    if (!updatedUsers) {
      await transaction.rollback();
      return res.status(404).json({ message: 'User not found' });
    }

    await transaction.commit();

    res.json({ message: 'User soft deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};
