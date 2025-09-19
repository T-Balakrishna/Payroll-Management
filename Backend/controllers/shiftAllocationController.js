const Shift  = require('../models/Shift');
const Employee = require('../models/Employee');
const Department=require('../models/Department');

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
  getShiftAllocationData: async (req, res) => {
  try {
    const shifts = await Shift.findAll({
      attributes: ['shiftId', 'shiftName'],
      order: [['shiftName', 'ASC']],
    });
    const departments = await Department.findAll({
      attributes: ['departmentId', 'departmentName'],
      order: [['departmentName', 'ASC']],
    });
    res.json({ shifts, departments });
  } catch (error) {
    console.error('Error fetching shift allocation data:', error);
    res.status(500).json({ error: 'Failed to fetch shift allocation data' });
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