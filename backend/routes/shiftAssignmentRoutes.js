const { ShiftAssignment } = require('../models');

// Get all shift assignments
// In real usage: almost always filtered by employeeId, date range, companyId, status
exports.getAllShiftAssignments = async (req, res) => {
  try {
    const shiftAssignments = await ShiftAssignment.findAll({
      include: [
        { model: require('../models').Employee, as: 'employee' },
        { model: require('../models').ShiftType, as: 'shiftType' },
        { model: require('../models').Company, as: 'company' },
        { model: require('../models').User, as: 'creator' },
        { model: require('../models').User, as: 'updater' },
        // { model: require('../models').Attendance, as: 'attendances' }   // heavy — include only when needed
      ]
    });
    res.json(shiftAssignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single shift assignment by ID
exports.getShiftAssignmentById = async (req, res) => {
  try {
    const shiftAssignment = await ShiftAssignment.findByPk(req.params.id, {
      include: [
        { model: require('../models').Employee, as: 'employee' },
        { model: require('../models').ShiftType, as: 'shiftType' },
        { model: require('../models').Company, as: 'company' },
        { model: require('../models').User, as: 'creator' },
        { model: require('../models').User, as: 'updater' },
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
exports.createShiftAssignment = async (req, res) => {
  try {
    const shiftAssignment = await ShiftAssignment.create(req.body);
    res.status(201).json(shiftAssignment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update shift assignment
exports.updateShiftAssignment = async (req, res) => {
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
exports.deleteShiftAssignment = async (req, res) => {
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