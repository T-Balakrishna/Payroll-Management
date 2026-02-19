import db from '../models/index.js';
const { ShiftAssignment, Employee } = db;
// Get all shift assignments
// In real usage: almost always filtered by staffId, date range, companyId, status
export const getAllShiftAssignments = async (req, res) => {
  try {
    const where = {};
    if (req.query.companyId) where.companyId = req.query.companyId;
    if (req.query.staffId) where.staffId = req.query.staffId;

    const shiftAssignments = await ShiftAssignment.findAll({
      where,
      include: [
        { model: db.Employee, as: 'employee' },
        { model: db.ShiftType, as: 'shiftType' },
        { model: db.Company, as: 'company' },
        
        // { model: db.Attendance, as: 'attendances' }   // heavy — include only when needed
      ]
    });
    res.json(shiftAssignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single shift assignment by ID
export const getShiftAssignmentById = async (req, res) => {
  try {
    const shiftAssignment = await ShiftAssignment.findByPk(req.params.id, {
      include: [
        { model: db.Employee, as: 'employee' },
        { model: db.ShiftType, as: 'shiftType' },
        { model: db.Company, as: 'company' },
        
      ]
    });

    if (!shiftAssignment) {
      return res.status(404).json({ message: 'Shift assignment not found' });
    }

    res.json(shiftAssignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new shift assignment
export const createShiftAssignment = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const payload = {
      ...req.body,
      staffId: Number(req.body.staffId),
      shiftTypeId: Number(req.body.shiftTypeId),
    };

    const employee = await Employee.findByPk(payload.staffId, { transaction });
    if (!employee) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Employee not found' });
    }

    let shiftAssignment = await ShiftAssignment.findOne({
      where: { staffId: payload.staffId },
      transaction,
    });

    if (shiftAssignment) {
      await shiftAssignment.update(payload, { transaction });
    } else {
      shiftAssignment = await ShiftAssignment.create(payload, { transaction });
    }

    await employee.update({ shiftTypeId: payload.shiftTypeId }, { transaction });
    await transaction.commit();

    res.status(201).json(shiftAssignment);
  } catch (error) {
    await transaction.rollback();
    res.status(400).json({ error: error.message });
  }
};

// Update shift assignment
export const updateShiftAssignment = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const shiftAssignment = await ShiftAssignment.findByPk(req.params.id, { transaction });
    if (!shiftAssignment) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Shift assignment not found' });
    }

    const payload = {
      ...req.body,
      ...(req.body.shiftTypeId !== undefined ? { shiftTypeId: Number(req.body.shiftTypeId) } : {}),
      ...(req.body.staffId !== undefined ? { staffId: Number(req.body.staffId) } : {}),
    };

    await shiftAssignment.update(payload, { transaction });

    const effectiveStaffId = Number(payload.staffId ?? shiftAssignment.staffId);
    const effectiveShiftTypeId = Number(payload.shiftTypeId ?? shiftAssignment.shiftTypeId);

    await Employee.update(
      { shiftTypeId: effectiveShiftTypeId },
      {
        where: { staffId: effectiveStaffId },
        transaction,
      }
    );

    await transaction.commit();

    const refreshed = await ShiftAssignment.findByPk(req.params.id);
    res.json(refreshed);
  } catch (error) {
    await transaction.rollback();
    res.status(400).json({ error: error.message });
  }
};

// Delete shift assignment (soft delete via paranoid: true)
export const deleteShiftAssignment = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const shiftAssignment = await ShiftAssignment.findByPk(req.params.id, { transaction });
    if (!shiftAssignment) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Shift assignment not found' });
    }

    await Employee.update(
      { shiftTypeId: null },
      {
        where: {
          staffId: shiftAssignment.staffId,
          shiftTypeId: shiftAssignment.shiftTypeId,
        },
        transaction,
      }
    );

    await shiftAssignment.destroy({ transaction });
    await transaction.commit();

    res.json({ message: 'Shift assignment deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};
