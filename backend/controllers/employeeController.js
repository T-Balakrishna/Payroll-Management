import db from '../models/index.js';
const { Employee, User } = db;

const normalizeFilterValues = (value) => {
  if (value === undefined || value === null || value === '') return [];
  return (Array.isArray(value) ? value : [value])
    .map((item) => String(item).trim())
    .filter(Boolean);
};

const buildInFilter = (value, parser = (item) => item) => {
  const parsed = normalizeFilterValues(value)
    .map((item) => parser(item))
    .filter((item) => item !== null && item !== undefined && item !== '');

  if (parsed.length === 0) return undefined;
  if (parsed.length === 1) return parsed[0];
  return { [db.Sequelize.Op.in]: parsed };
};

const buildWhere = (query = {}) => {
  const where = {};

  const staffId = buildInFilter(query.staffId, (item) => {
    const parsed = Number.parseInt(item, 10);
    return Number.isInteger(parsed) ? parsed : undefined;
  });
  const companyId = buildInFilter(query.companyId, (item) => {
    const parsed = Number.parseInt(item, 10);
    return Number.isInteger(parsed) ? parsed : undefined;
  });
  const departmentId = buildInFilter(query.departmentId, (item) => {
    const parsed = Number.parseInt(item, 10);
    return Number.isInteger(parsed) ? parsed : undefined;
  });
  const designationId = buildInFilter(query.designationId, (item) => {
    const parsed = Number.parseInt(item, 10);
    return Number.isInteger(parsed) ? parsed : undefined;
  });
  const employeeGradeId = buildInFilter(query.employeeGradeId, (item) => {
    const parsed = Number.parseInt(item, 10);
    return Number.isInteger(parsed) ? parsed : undefined;
  });
  const status = buildInFilter(query.status);

  if (staffId !== undefined) where.staffId = staffId;
  if (companyId !== undefined) where.companyId = companyId;
  if (departmentId !== undefined) where.departmentId = departmentId;
  if (designationId !== undefined) where.designationId = designationId;
  if (employeeGradeId !== undefined) where.employeeGradeId = employeeGradeId;
  if (status !== undefined) where.status = status;

  return where;
};

const resolveRoleIdFromStaffNumber = async (staffNumber) => {
  const normalizedStaffNumber = String(staffNumber || '').trim();
  if (!normalizedStaffNumber) return { roleId: null, user: null };

  const user = await User.findOne({
    where: { userNumber: normalizedStaffNumber },
    attributes: ['userId', 'userNumber', 'roleId'],
  });

  if (!user) {
    return { roleId: null, user: null };
  }

  return { roleId: user.roleId ?? null, user };
};

// Get all employees
export const getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.findAll({
      where: buildWhere(req.query),
      include: [
        { model: db.Department, as: 'department', required: false },
        { model: db.Role, as: 'role', required: false },
        { model: db.Designation, as: 'designation', required: false },
        { model: db.EmployeeGrade, as: 'employeeGrade', required: false },
        {
          model: db.User,
          as: 'user',
          required: false,
          attributes: ['userNumber', 'roleId'],
          include: [{ model: db.Role, as: 'role', attributes: ['roleId', 'roleName'], required: false }],
        },
      ],
      order: [['staffId', 'DESC']],
    });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get employee by ID
export const getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id, {
      include: [
        { model: db.Department, as: 'department' },
        { model: db.Role, as: 'role', required: false },
        { model: db.Designation, as: 'designation' },
      ]
    });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new employee
export const createEmployee = async (req, res) => {
  try {
    const payload = { ...req.body };
    const { roleId, user } = await resolveRoleIdFromStaffNumber(payload.staffNumber);

    if (payload.staffNumber && !user) {
      return res.status(400).json({ error: 'staffNumber must exist in users table' });
    }

    if (roleId !== null) {
      payload.roleId = roleId;
    }

    const employee = await Employee.create(payload);
    res.status(201).json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update employee
export const updateEmployee = async (req, res) => {
  try {
    const existingEmployee = await Employee.findByPk(req.params.id);
    if (!existingEmployee) return res.status(404).json({ message: 'Employee not found' });

    const payload = { ...req.body };
    const staffNumber = payload.staffNumber ?? existingEmployee.staffNumber;

    const { roleId, user } = await resolveRoleIdFromStaffNumber(staffNumber);
    if (staffNumber && !user) {
      return res.status(400).json({ error: 'staffNumber must exist in users table' });
    }

    if (roleId !== null) {
      payload.roleId = roleId;
    }

    const [updated] = await Employee.update(payload, { where: { staffId: req.params.id } });
    if (!updated) return res.status(404).json({ message: 'Employee not found' });
    const employee = await Employee.findByPk(req.params.id, {
      include: [
        { model: db.Department, as: 'department' },
        { model: db.Role, as: 'role', required: false },
        { model: db.Designation, as: 'designation', required: false },
      ],
    });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete employee
export const deleteEmployee = async (req, res) => {
  try {
    const deleted = await Employee.destroy({ where: { staffId: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Employee not found' });
    res.json({ message: 'Employee deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
