const { Attendance } = require('../models');

// Get all attendances (usually filtered by company or date range in real use)
exports.getAllAttendances = async (req, res) => {
  try {
    const attendances = await Attendance.findAll({
      include: [
        { model: require('../models').Employee, as: 'employee' },
        { model: require('../models').Company,   as: 'company' },
        { model: require('../models').ShiftType, as: 'shiftType' },
        { model: require('../models').ShiftAssignment, as: 'shiftAssignment' },
        { model: require('../models').User, as: 'approver' },
        { model: require('../models').User, as: 'creator' },
        { model: require('../models').User, as: 'updater' },
      ]
    });
    res.json(attendances);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get attendance by ID
exports.getAttendanceById = async (req, res) => {
  try {
    const attendance = await Attendance.findByPk(req.params.id, {
      include: [
        { model: require('../models').Employee, as: 'employee' },
        { model: require('../models').Company,   as: 'company' },
        { model: require('../models').ShiftType, as: 'shiftType' },
        { model: require('../models').ShiftAssignment, as: 'shiftAssignment' },
        { model: require('../models').User, as: 'approver' },
        { model: require('../models').User, as: 'creator' },
        { model: require('../models').User, as: 'updater' },
      ]
    });

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new attendance record
exports.createAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.create(req.body);
    res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update attendance
exports.updateAttendance = async (req, res) => {
  try {
    const [updated] = await Attendance.update(req.body, {
      where: { attendanceId: req.params.id }
    });

    if (!updated) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    const attendance = await Attendance.findByPk(req.params.id);
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete attendance (soft delete supported via paranoid: true)
exports.deleteAttendance = async (req, res) => {
  try {
    const deleted = await Attendance.destroy({
      where: { attendanceId: req.params.id }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    res.json({ message: 'Attendance record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};