const Attendance = require('../models/Attendance'); // Sequelize model
const Employee = require('../models/Employee');
const { Op } = require('sequelize');

// Create
exports.createAttendance = async (req, res) => {
  try {
    const { employeeNumber, attendanceDate, attendanceStatus } = req.body;
    const newAttendance = await Attendance.create({
      employeeNumber,
      attendanceDate,
      attendanceStatus
    });

    res.status(201).json(newAttendance);
  } catch (error) {
    console.error("❌ Error creating attendance:", error);
    res.status(500).send("Error creating attendance: " + error.message);
  }
};

// Read All
// Read All with optional filters
 // Make sure this is imported

exports.getAllAttendances = async (req, res) => {
  try {
    const { date, employeeNumber, startDate, endDate } = req.query;
    const where = {};

    // Partial search for employeeNumber
    if (employeeNumber) {
      where.employeeNumber = {
        [Op.like]: `%${employeeNumber}%`  // % means anything before or after
      };
    }

    // Daily filter
    if (date) {
      where.attendanceDate = date;
    }

    // Monthly / Yearly filter
    if (startDate && endDate) {
      where.attendanceDate = {
        [Op.between]: [startDate, endDate]
      };
    }

    const attendances = await Attendance.findAll({
      where,
      include: [{ model: Employee }]
    });

    res.json(attendances);
  } catch (error) {
    console.error("❌ Error fetching attendances:", error);
    res.status(500).send("Error fetching attendances: " + error.message);
  }
};



// Read One by ID
exports.getAttendanceById = async (req, res) => {
  try {
    const attendance = await Attendance.findOne({
      where: { attendanceId: req.params.id },
      include: [{ model: Employee }]
    });
    if (!attendance) return res.status(404).send("Attendance not found");
    res.json(attendance);
  } catch (error) {
    res.status(500).send("Error fetching attendance: " + error.message);
  }
};

// Update
exports.updateAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findOne({ where: { attendanceId: req.params.id } });
    if (!attendance) return res.status(404).send("Attendance not found");

    await attendance.update(req.body);
    res.json(attendance);
  } catch (error) {
    console.error("❌ Error updating attendance:", error);
    res.status(500).send("Error updating attendance: " + error.message);
  }
};

// Delete (hard delete since no status column exists)
exports.deleteAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findOne({ where: { attendanceId: req.params.id } });
    if (!attendance) return res.status(404).send("Attendance not found");

    await attendance.destroy();
    res.json({ message: "Attendance deleted successfully" });
  } catch (error) {
    res.status(500).send("Error deleting attendance: " + error.message);
  }
};
