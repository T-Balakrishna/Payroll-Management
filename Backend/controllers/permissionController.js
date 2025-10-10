const Permission = require('../models/Permission');
const Employee = require('../models/Employee');
const { Op } = require('sequelize');

exports.createPermission = async (req, res) => {
  const { employeeNumber, permissionDate, permissionHours, companyId, createdBy } = req.body;

  if (!employeeNumber || !permissionDate || !permissionHours || !companyId) {
    return res.status(400).json({ error: 'employeeNumber, permissionDate, permissionHours, and companyId are required' });
  }

  try {
    // Validate employee exists and belongs to the company
    const employee = await Employee.findOne({ where: { employeeNumber, companyId } });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found in the specified company' });
    }

    // Create permission record
    const permission = await Permission.create({
      employeeNumber,
      permissionDate,
      permissionHours,
      remainingHours: permissionHours, // Initially, remaining equals requested
      companyId,
      createdBy,
    });

    res.status(201).json({ message: 'Permission record created successfully', permission });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create permission record', details: error.message });
  }
};

exports.getPermissionList = async (req, res) => {
  const { companyId, departmentId } = req.query;

  if (!companyId) {
    return res.status(400).json({ error: 'companyId is required' });
  }

  try {
    // Build where clause for filtration
    const where = { companyId };
    const employeeWhere = { companyId, status: 'active' };
    if (departmentId) {
      employeeWhere.departmentId = departmentId;
    }

    // Fetch permissions with employee details
    const permissions = await Permission.findAll({
      where,
      include: [{
        model: Employee,
        attributes: ['employeeNumber', 'employeeName', 'departmentId'],
        where: employeeWhere,
        as: 'Employee',
      }],
      order: [['permissionDate', 'DESC']],
    });

    const list = permissions.map(perm => ({
      permissionId: perm.permissionId,
      employeeNumber: perm.employeeNumber,
      employeeName: perm.Employee?.employeeName || 'Unknown',
      departmentId: perm.Employee?.departmentId,
      permissionDate: perm.permissionDate,
      permissionHours: perm.permissionHours,
      remainingHours: perm.remainingHours,
    }));

    res.status(200).json({ list });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get permission list', details: error.message });
  }
};

exports.getRemainingForMonth = async (req, res) => {
  const { employeeNumber, month } = req.params;
  const monthIndex = parseInt(month, 10);

  if (isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return res.status(400).json({ error: 'Invalid month (must be 0-11)' });
  }

  try {
    const employee = await Employee.findOne({ where: { employeeNumber } });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Get all permissions for the employee in the specified month
    const startOfMonth = new Date(new Date().getFullYear(), monthIndex, 1);
    const endOfMonth = new Date(new Date().getFullYear(), monthIndex + 1, 0);

    const permissions = await Permission.findAll({
      where: {
        employeeNumber,
        permissionDate: {
          [Op.between]: [startOfMonth, endOfMonth],
        },
      },
    });

    // Sum remaining hours for the month
    const totalRemaining = permissions.reduce((sum, perm) => sum + perm.remainingHours, 0);

    res.status(200).json({ remaining: totalRemaining });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get remaining hours', details: error.message });
  }
};

exports.reducePermissionHours = async (req, res) => {
  const { employeeNumber, month } = req.params;
  const { hours, updatedBy } = req.body;
  const monthIndex = parseInt(month, 10);

  if (isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return res.status(400).json({ error: 'Invalid month (must be 0-11)' });
  }

  if (hours === undefined || hours <= 0) {
    return res.status(400).json({ error: 'hours must be a positive number' });
  }

  try {
    const employee = await Employee.findOne({ where: { employeeNumber } });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Find permissions for the employee in the specified month
    const startOfMonth = new Date(new Date().getFullYear(), monthIndex, 1);
    const endOfMonth = new Date(new Date().getFullYear(), monthIndex + 1, 0);

    const permissions = await Permission.findAll({
      where: {
        employeeNumber,
        permissionDate: {
          [Op.between]: [startOfMonth, endOfMonth],
        },
      },
    });

    let remainingToReduce = hours;

    // Update permissions in order, reducing remainingHours
    for (let perm of permissions) {
      if (remainingToReduce <= 0) break;

      const available = perm.remainingHours;
      const reduceBy = Math.min(available, remainingToReduce);
      perm.remainingHours -= reduceBy;
      remainingToReduce -= reduceBy;

      await perm.update({ remainingHours: perm.remainingHours, updatedBy });
    }

    if (remainingToReduce > 0) {
      return res.status(400).json({ error: 'Insufficient remaining hours for this month' });
    }

    res.status(200).json({ message: 'Permission hours reduced successfully', reduced: hours });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reduce permission hours', details: error.message });
  }
};