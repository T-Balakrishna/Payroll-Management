const Attendance = require('../models/Attendance'); 
const Employee = require('../models/Employee');
const { Op } = require('sequelize');

// ✅ Create Attendance
exports.createAttendance = async (req, res) => {
  try {
    const { employeeNumber, attendanceDate, attendanceStatus, companyId } = req.body;

    if (!employeeNumber || !attendanceDate || !attendanceStatus || !companyId) {
      return res.status(400).json({ message: "All fields (employeeNumber, attendanceDate, attendanceStatus, companyId) are required." });
    }

    const newAttendance = await Attendance.create({
      employeeNumber,
      attendanceDate,
      attendanceStatus,
      companyId
    });

    res.status(201).json(newAttendance);
  } catch (error) {
    console.error("❌ Error creating attendance:", error);
    res.status(500).send("Error creating attendance: " + error.message);
  }
};

// ✅ Get All Attendances (with filters)
exports.getAllAttendances = async (req, res) => {
  try {
    const { date, employeeNumber, startDate, endDate, companyId } = req.query;
    const where = {};

    if (employeeNumber) {
      where.employeeNumber = { [Op.like]: `%${employeeNumber}%` };
    }

    if (companyId) {
      where.companyId = companyId;
    }

    if (date) {
      where.attendanceDate = date;
    }

    if (startDate && endDate) {
      where.attendanceDate = { [Op.between]: [startDate, endDate] };
    }

    const attendances = await Attendance.findAll({
      where,
      include: [{ model: Employee,as:'employee' }]
    });

    res.json(attendances);
  } catch (error) {
    console.error("❌ Error fetching attendances:", error);
    res.status(500).send("Error fetching attendances: " + error.message);
  }
};

// ✅ Get Attendance by ID
exports.getAttendanceById = async (req, res) => {
  try {
    const attendance = await Attendance.findOne({
      where: { attendanceId: req.params.id },
      include: [{ model: Employee, as: 'employee' }]
    });

    if (!attendance) {
      return res.status(404).send("Attendance not found");
    }

    res.json(attendance);
  } catch (error) {
    console.error("❌ Error fetching attendance:", error);
    res.status(500).send("Error fetching attendance: " + error.message);
  }
};

// ✅ Update Attendance
exports.updateAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findOne({
      where: { attendanceId: req.params.id }
    });

    if (!attendance) {
      return res.status(404).send("Attendance not found");
    }

    const { employeeNumber, attendanceDate, attendanceStatus, companyId } = req.body;

    await attendance.update({
      employeeNumber,
      attendanceDate,
      attendanceStatus,
      companyId
    });

    res.json(attendance);
  } catch (error) {
    console.error("❌ Error updating attendance:", error);
    res.status(500).send("Error updating attendance: " + error.message);
  }
};

// ✅ Delete Attendance
exports.deleteAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findOne({
      where: { attendanceId: req.params.id }
    });

    if (!attendance) {
      return res.status(404).send("Attendance not found");
    }

    await attendance.destroy();
    res.json({ message: "Attendance deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting attendance:", error);
    res.status(500).send("Error deleting attendance: " + error.message);
  }
};

// Get count of active attendances by company
exports.getAttendanceCount = async (req, res) => {
  try {
    const { companyId } = req.params;
    const whereClause = {};
    if(!companyId) return res.status(400).json({ message: 'Company ID is required' });
    
    const count = await Attendance.count({ where: whereClause });
    res.status(200).json({ count });
  } catch (error) {
    console.error('❌ Error fetching attendance count:', error);
    res.status(500).json({ message: 'Error fetching attendance count: ' + error.message });
  }
};