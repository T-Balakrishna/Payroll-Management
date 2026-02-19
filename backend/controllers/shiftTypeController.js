import db from '../models/index.js';
const { ShiftType } = db;

const WEEKLY_OFF_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const normalizeWeeklyOff = (value) => {
  if (value == null) return ['sunday'];

  let parsed = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = [];
    }
  }

  if (Array.isArray(parsed)) {
    return [...new Set(parsed
      .map((day) => String(day || '').trim().toLowerCase())
      .filter((day) => WEEKLY_OFF_DAYS.includes(day)))];
  }

  if (typeof parsed === 'object' && parsed) {
    return WEEKLY_OFF_DAYS.filter((day) => Boolean(parsed[day]));
  }

  return [];
};

const withNormalizedWeeklyOff = (body = {}) => {
  if (!Object.prototype.hasOwnProperty.call(body, 'weeklyOff')) {
    return body;
  }
  return {
    ...body,
    weeklyOff: normalizeWeeklyOff(body.weeklyOff),
  };
};
// Get all shift types
// In real usage: almost always filtered by companyId
export const getAllShiftTypes = async (req, res) => {
  try {
    const shiftTypes = await ShiftType.findAll({
      include: [
        { model: db.Company, as: 'company' },
        
        // { model: db.ShiftAssignment, as: 'shiftAssignments' },   // heavy — include only when needed
        // { model: db.Attendance, as: 'attendances' }
      ]
    });
    res.json(shiftTypes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single shift type by ID
export const getShiftTypeById = async (req, res) => {
  try {
    const shiftType = await ShiftType.findByPk(req.params.id, {
      include: [
        { model: db.Company, as: 'company' },
        
      ]
    });

    if (!shiftType) {
      return res.status(404).json({ message: 'Shift type not found' });
    }

    res.json(shiftType);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new shift type
export const createShiftType = async (req, res) => {
  try {
    const shiftType = await ShiftType.create(withNormalizedWeeklyOff(req.body));
    res.status(201).json(shiftType);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update shift type
export const updateShiftType = async (req, res) => {
  try {
    const [updated] = await ShiftType.update(withNormalizedWeeklyOff(req.body), {
      where: { shiftTypeId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Shift type not found' });
    }

    const shiftType = await ShiftType.findByPk(req.params.id);
    res.json(shiftType);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete shift type (soft delete via paranoid: true)
export const deleteShiftType = async (req, res) => {
  try {
    const deleted = await ShiftType.destroy({
      where: { shiftTypeId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Shift type not found' });
    }

    res.json({ message: 'Shift type deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
