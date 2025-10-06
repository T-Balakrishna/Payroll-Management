const Shift  = require('../models/Shift');
const Employee = require('../models/Employee');
const Department=require('../models/Department');
const { Op } = require('sequelize');

const shiftAllocationController = {
  getShifts: async (req, res) => {
    try {
      const shifts = await Shift.findAll({
        attributes: ['shiftId', 'shiftName'],
        order: [['shiftName', 'ASC']],
      });
      res.json(shifts);
    } catch (error) {
      console.error('Error fetching shifts:', error);
      res.status(500).json({ error: 'Failed to fetch shifts' });
    }
  },
  getDepartments: async (req, res) => {
    try {
      const { companyId } = req.query;
      const where = {};
      if (companyId) {
        where.companyId = companyId;
      }
      const departments = await Department.findAll({
        where,
        attributes: ['departmentId', 'departmentName'],
        order: [['departmentName', 'ASC']],
      });
      res.json(departments);
    } catch (error) {
      console.error('Error fetching departments:', error);
      res.status(500).json({ error: 'Failed to fetch departments' });
    }
  },
  getEmployeesByDepartments: async (req, res) => {
    try {
      const { departments, companyId } = req.body;
      if (!departments || !Array.isArray(departments) || departments.length === 0) {
        return res.json([]);
      }
      let where = {
        departmentId: { [Op.in]: departments }
      };
      if (companyId) {
        where.companyId = companyId;
      }
      const employees = await Employee.findAll({
        where,
        attributes: ['employeeNumber', 'employeeName', 'shiftId'],
        order: [['employeeName', 'ASC']],
      });
      res.json(employees);
    } catch (error) {
      console.error('Error fetching employees by departments:', error);
      res.status(500).json({ error: 'Failed to fetch employees' });
    }
  },
  allocateShifts: async (req, res) => {
    const { allocations } = req.body;
    if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
      return res.status(400).json({ error: 'Invalid allocations data' });
    }
    try {
      await Employee.sequelize.transaction(async (t) => {
        for (const allocation of allocations) {
          const { employeeNumber, shiftId, updatedBy } = allocation;
          if (!employeeNumber || !shiftId) {
            throw new Error(`Invalid allocation for employee ${employeeNumber}`);
          }
          const result = await Employee.update(
            { shiftId, updatedBy, updatedAt: new Date() },
            { where: { employeeNumber }, transaction: t }
          );
          if (result[0] === 0) {
            throw new Error(`No employee found with number ${employeeNumber}`);
          }
        }
      });
      res.json({ message: 'Shifts allocated successfully' });
    } catch (error) {
      console.error('Error allocating shifts:', error);
      res.status(500).json({ error: 'Failed to allocate shifts' });
    }
  },
};

module.exports = shiftAllocationController;