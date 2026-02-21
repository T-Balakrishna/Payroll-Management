import db from '../models/index.js';
import { hashPassword } from '../utils/password.js';
import { resolveCompanyContext } from '../utils/companyScope.js';
const { User, Role, StudentDetails, Employee, Company, Department } = db;

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
export const getAllUsers = async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive || '').toLowerCase() === 'true';
    const users = await User.findAll({
      where: includeInactive ? {} : { status: 'Active' },
      include: [
        { model: db.Company, as: 'company' },
        { model: db.Department, as: 'department' },
        { model: db.Role, as: 'role' },
        
      ]
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single user by ID
export const getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [
        { model: db.Company, as: 'company' },
        { model: db.Department, as: 'department' },
        { model: db.Role, as: 'role' },
        
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const employee = await Employee.findOne({
      where: { staffNumber: user.userNumber },
      attributes: ['staffId', 'firstName', 'lastName', 'profilePhoto', 'departmentId'],
    });

    const payload = user.toJSON();
    if (employee) {
      payload.staffId = employee.staffId;
      payload.employeeId = employee.staffId; // Backward compatibility for existing frontend checks
      if (!payload.firstName) payload.firstName = employee.firstName;
      if (!payload.lastName) payload.lastName = employee.lastName;
      if (!payload.photo) payload.photo = employee.profilePhoto;
      if (!payload.departmentId) payload.departmentId = employee.departmentId;
    }

    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new user
export const createUser = async (req, res) => {
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

    const companyContext = await resolveCompanyContext(req, {
      requireCompanyId: true,
      payloadCompanyId: req.body?.companyId,
    });
    if (!companyContext.ok) {
      await transaction.rollback();
      return res.status(companyContext.status).json({ error: companyContext.message });
    }
    const effectiveCompanyId = companyContext.effectiveCompanyId;

    const hashedPassword = await hashPassword(req.body.password);
    const normalizedRole = normalizeRoleName(role.roleName);
    const isStaffRole = STAFF_ROLE_KEYS.has(normalizedRole);
    const isStudentRole = normalizedRole === 'student';
    const departmentId =
      req.body?.departmentId !== undefined && req.body?.departmentId !== ''
        ? req.body.departmentId
        : null;

    if (isStaffRole && !departmentId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Department is required for staff roles' });
    }

    const userPayload = {
      ...req.body,
      companyId: effectiveCompanyId,
      departmentId,
      password: hashedPassword,
    };

    const user = await User.create(userPayload, { transaction });

    const { firstName, lastName } = splitNameParts(user.userName || user.userNumber);
    if (isStaffRole) {
      await Employee.findOrCreate({
        where: { staffNumber: user.userNumber },
        defaults: {
          staffNumber: user.userNumber,
          companyId: effectiveCompanyId,
          departmentId: user.departmentId,
          firstName: firstName || user.userNumber,
          lastName: lastName || null,
          personalEmail: user.userMail,
          officialEmail: user.userMail,
          dateOfJoining: new Date(),
          status: 'Active',
          employmentStatus: 'Active',
          createdBy: user.createdBy || null,
          updatedBy: user.updatedBy || null,
        },
        transaction,
      });
    } else if (isStudentRole) {
      await StudentDetails.findOrCreate({
        where: { registerNumber: user.userNumber },
        defaults: {
          studentName: user.userName || user.userNumber,
          registerNumber: user.userNumber,
          departmentId: user.departmentId || null,
          companyId: effectiveCompanyId,
          staffId: null,
          companyId: effectiveCompanyId,
          staffId: employee?.staffId || null,
          createdBy: user.createdBy || null,
          updatedBy: user.updatedBy || null,
        },
        transaction,
      });

      if (student && !student.staffId && employee?.staffId) {
        await student.update({ staffId: employee.staffId }, { transaction });
      }
    }

    if (employee && !employee.companyId) {
      await employee.update({ companyId: effectiveCompanyId }, { transaction });
    }

    await transaction.commit();
    res.status(201).json(user);
  } catch (error) {
    await transaction.rollback();
    res.status(400).json({ error: error.message });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const payload = { ...req.body };

    const hasCompanyIdInPayload = Object.prototype.hasOwnProperty.call(payload, 'companyId');
    const companyContext = await resolveCompanyContext(req, {
      requireCompanyId: false,
      payloadCompanyId: hasCompanyIdInPayload ? payload.companyId : undefined,
    });
    if (!companyContext.ok) {
      return res.status(companyContext.status).json({ error: companyContext.message });
    }

    if (companyContext.actor && !companyContext.isSuperAdmin) {
      payload.companyId = companyContext.effectiveCompanyId;
    } else if (hasCompanyIdInPayload && !companyContext.requestedCompanyId) {
      return res.status(400).json({ error: 'companyId must be a positive integer when provided' });
    }

    if (typeof payload.password === 'string') {
      if (payload.password.trim()) {
        payload.password = await hashPassword(payload.password);
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
export const deleteUser = async (req, res) => {
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

// Get company details by userNumber
// Used by Admin/Super Admin dashboard context setup
export const getCompanyByUserNumber = async (req, res) => {
  try {
    const { userNumber } = req.params;

    const user = await User.findOne({
      where: { userNumber },
      attributes: ['userId', 'userNumber', 'companyId'],
      include: [{ model: Company, as: 'company', attributes: ['companyId', 'companyName', 'companyAcr'] }],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.company) {
      return res.status(404).json({ message: 'Company not mapped for this user' });
    }

    return res.json({
      userId: user.userId,
      userNumber: user.userNumber,
      companyId: user.company.companyId,
      companyName: user.company.companyName,
      companyAcr: user.company.companyAcr,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Get department + company details by userNumber
// Used by Department Admin dashboard context setup
export const getDepartmentByUserNumber = async (req, res) => {
  try {
    const { userNumber } = req.params;

    const user = await User.findOne({
      where: { userNumber },
      attributes: ['userId', 'userNumber', 'companyId', 'departmentId'],
      include: [
        { model: Company, as: 'company', attributes: ['companyId', 'companyName', 'companyAcr'] },
        { model: Department, as: 'department', attributes: ['departmentId', 'departmentName', 'departmentAcr'] },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.company) {
      return res.status(404).json({ message: 'Company not mapped for this user' });
    }

    if (!user.department) {
      return res.status(404).json({ message: 'Department not mapped for this user' });
    }

    return res.json({
      userId: user.userId,
      userNumber: user.userNumber,
      companyId: user.company.companyId,
      companyName: user.company.companyName,
      companyAcr: user.company.companyAcr,
      departmentId: user.department.departmentId,
      departmentName: user.department.departmentName,
      departmentAcr: user.department.departmentAcr,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
