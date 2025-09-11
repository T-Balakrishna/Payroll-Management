const Attendance = require('../models/Attendance'); // Sequelize model
const Employee = require('../models/Employee');


// Create
exports.createAttendance = async (req, res) => {
  try {
    const { employeeId, attendanceDate, attendanceStatus } = req.body;
    const newAttendance = await Attendance.create({
      employeeId,
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
exports.getAllAttendances = async (req, res) => {
  try {
    const attendances = await Attendance.findAll({
      include: [{ model: Employee }],
    });
    res.json(attendances);
  } catch (error) {
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
