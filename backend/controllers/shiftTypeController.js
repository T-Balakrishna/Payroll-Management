const { ShiftType } = require('../models');

// Get all shift types
// In real usage: almost always filtered by companyId
exports.getAllShiftTypes = async (req, res) => {
  try {
    const shiftTypes = await ShiftType.findAll({
      include: [
        { model: require('../models').Company, as: 'company' },
        
        // { model: require('../models').ShiftAssignment, as: 'shiftAssignments' },   // heavy — include only when needed
        // { model: require('../models').Attendance, as: 'attendances' }
      ]
    });
    res.json(shiftTypes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single shift type by ID
exports.getShiftTypeById = async (req, res) => {
  try {
    const shiftType = await ShiftType.findByPk(req.params.id, {
      include: [
        { model: require('../models').Company, as: 'company' },
        
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
exports.createShiftType = async (req, res) => {
  try {
    const shiftType = await ShiftType.create(req.body);
    res.status(201).json(shiftType);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update shift type
exports.updateShiftType = async (req, res) => {
  try {
    const [updated] = await ShiftType.update(req.body, {
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
exports.deleteShiftType = async (req, res) => {
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