const  Holiday  = require("../models/Holiday");

// Add manual holiday (update if exists)
exports.addHoliday = async (req, res) => {
  try {
    const { holidayPlanId, holidayDate, description, createdBy } = req.body;

    let existing = await Holiday.findOne({
      where: { holidayPlanId, holidayDate, status: "active" },
    });

    if (existing) {
      // Append new description with comma if not duplicate
      const updatedDescription = existing.description.includes(description)
        ? existing.description
        : existing.description + ", " + description;

      await existing.update({ description: updatedDescription, updatedBy: createdBy });
      return res.json({ message: "Holiday updated", holiday: existing });
    }

    const newHoliday = await Holiday.create({
      holidayPlanId,
      holidayDate,
      description,
      createdBy,
      status: "active",
    });

    res.status(201).json(newHoliday);
  } catch (err) {
    res.status(500).send("Error adding holiday: " + err.message);
  }
};

// Get all holidays of a plan
exports.getHolidaysByPlan = async (req, res) => {
  try {
    const holidays = await Holiday.findAll({
      where: { holidayPlanId: req.params.planId, status: "active" },
    });
    res.json(holidays);
  } catch (err) {
    res.status(500).send("Error fetching holidays: " + err.message);
  }
};

// Edit holiday
exports.updateHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findOne({
      where: { holidayId: req.params.id, status: "active" },
    });
    if (!holiday) return res.status(404).send("Holiday not found");

    await holiday.update({ ...req.body, updatedBy: req.body.updatedBy });
    res.json(holiday);
  } catch (err) {
    res.status(500).send("Error updating holiday: " + err.message);
  }
};

// Soft delete holiday
exports.deleteHoliday = async (req, res) => {
  console.log(req.body)
  try {
    const holiday = await Holiday.findOne({
      where: { holidayId: req.params.id, status: "active" },
    });
    if (!holiday) return res.status(404).send("Holiday not found");
    console.log(req.body.updatedBy);    
    await holiday.update({ status: "inactive", updatedBy: req.body.updatedBy });
    res.json({ message: "Holiday deleted successfully" });
  } catch (err) {
    res.status(500).send("Error deleting holiday: "+req.body + err.message);
  }
};