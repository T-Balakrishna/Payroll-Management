const Shift = require('../models/Shift'); // Sequelize model

// Create
exports.createShift = async (req, res) => {
  try {
    const {
      shiftName,
      shiftInStartTime,
      shiftInEndTime,
      shiftOutStartTime,
      shiftMinHours,
      shiftNextDay,
      companyId,
      createdBy
    } = req.body;

    if (!companyId) {
      return res.status(400).send("Company ID is required");
    }

    const newShift = await Shift.create({
      shiftName,
      shiftInStartTime,
      shiftInEndTime,
      shiftOutStartTime,
      shiftMinHours,
      shiftNextDay,
      companyId,
      createdBy
    });

    res.status(201).json(newShift);
  } catch (error) {
    console.error("❌ Error creating shift:", error);
    res.status(500).send("Error creating shift: " + error.message);
  }
};

// Read All (only active)
exports.getAllShifts = async (req, res) => {
  try {
    const whereClause = { status: 'active' };
    if (req.query.companyId) {
      whereClause.companyId = req.query.companyId;
    }
    const shifts = await Shift.findAll({ where: whereClause });
    res.json(shifts);
  } catch (error) {
    res.status(500).send("Error fetching shifts: " + error.message);
  }
};

// Read One by ID (only active)
exports.getShiftById = async (req, res) => {
  try {
    const whereClause = { shiftId: req.params.id, status: 'active' };
    if (req.query.companyId) {
      whereClause.companyId = req.query.companyId;
    }
    const shift = await Shift.findOne({ where: whereClause });
    if (!shift) return res.status(404).send("Shift not found or inactive");
    res.json(shift);
  } catch (error) {
    res.status(500).send("Error fetching shift: " + error.message);
  }
};

// Update
exports.updateShift = async (req, res) => {
  try {
    const whereClause = { shiftId: req.params.id, status: 'active' };
    if (req.query.companyId) {
      whereClause.companyId = req.query.companyId;
    }
    const shift = await Shift.findOne({ where: whereClause });
    if (!shift) return res.status(404).send("Shift not found or inactive");

    // Prevent updating companyId
    const { companyId, ...updateData } = req.body;
    await shift.update({ ...updateData, updatedBy: req.body.updatedBy });
    res.json(shift);
  } catch (error) {
    console.error("❌ Error updating shift:", error);
    res.status(500).send("Error updating shift: " + error.message);
  }
};

// Soft Delete (set status to inactive)
exports.deleteShift = async (req, res) => {
  try {
    const whereClause = { shiftId: req.params.id, status: 'active' };
    if (req.query.companyId) {
      whereClause.companyId = req.query.companyId;
    }
    const shift = await Shift.findOne({ where: whereClause });
    if (!shift) return res.status(404).send("Shift not found or already inactive");

    await shift.update({ status: 'inactive', updatedBy: req.body.updatedBy });
    res.json({ message: "Shift deactivated successfully" });
  } catch (error) {
    res.status(500).send("Error deleting shift: " + error.message);
  }
};