import db from '../models/index.js';
const { ShiftAssignment } = db;
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
  try {
    const shiftAssignment = await ShiftAssignment.create(req.body);
    res.status(201).json(shiftAssignment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update shift assignment
export const updateShiftAssignment = async (req, res) => {
  try {
    const [updated] = await ShiftAssignment.update(req.body, {
      where: { shiftAssignmentId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Shift assignment not found' });
    }

    const shiftAssignment = await ShiftAssignment.findByPk(req.params.id);
    res.json(shiftAssignment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete shift assignment (soft delete via paranoid: true)
export const deleteShiftAssignment = async (req, res) => {
  try {
    const deleted = await ShiftAssignment.destroy({
      where: { shiftAssignmentId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Shift assignment not found' });
    }

    res.json({ message: 'Shift assignment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
