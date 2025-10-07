const Holiday = require("../models/Holiday");

// Add manual holiday (update if exists)
exports.addHoliday = async (req, res) => {
  try {
    const { holidayPlanId, holidayDate, description, createdBy, companyId } = req.body;

    // Validate companyId
    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    // Check if holiday exists for the given plan and company
    let existing = await Holiday.findOne({
      where: { holidayPlanId, holidayDate, companyId, status: "active" },
    });

    if (existing) {
      // Append new description with comma if not duplicate
      const updatedDescription = existing.description.includes(description)
        ? existing.description
        : `${existing.description}, ${description}`;

      await existing.update({ description: updatedDescription, updatedBy: createdBy });
      return res.json({ message: "Holiday updated", holiday: existing });
    }

    const newHoliday = await Holiday.create({
      holidayPlanId,
      holidayDate,
      description,
      createdBy,
      companyId,
      status: "active",
    });

    res.status(201).json(newHoliday);
  } catch (err) {
    res.status(500).json({ message: "Error adding holiday", error: err.message });
  }
};

// Get all holidays of a plan
exports.getHolidaysByPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const { companyId } = req.query;

    // Validate companyId
    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    const holidays = await Holiday.findAll({
      where: { holidayPlanId: planId, companyId, status: "active" },
    });
    res.json(holidays);
  } catch (err) {
    res.status(500).json({ message: "Error fetching holidays", error: err.message });
  }
};

// Edit holiday
exports.updateHoliday = async (req, res) => {
  try {
    const { holidayId } = req.params;
    const { holidayPlanId, holidayDate, description, updatedBy, companyId } = req.body;

    // Validate companyId
    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    const holiday = await Holiday.findOne({
      where: { holidayId, companyId, status: "active" },
    });
    if (!holiday) {
      return res.status(404).json({ message: "Holiday not found" });
    }

    await holiday.update({ holidayPlanId, holidayDate, description, updatedBy, companyId });
    res.json(holiday);
  } catch (err) {
    res.status(500).json({ message: "Error updating holiday", error: err.message });
  }
};

// Soft delete holiday
exports.deleteHoliday = async (req, res) => {
  try {
    const { holidayId } = req.params;
    const { updatedBy, companyId } = req.body;

    // Validate companyId
    if (!companyId) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    const holiday = await Holiday.findOne({
      where: { holidayId, companyId, status: "active" },
    });
    if (!holiday) {
      return res.status(404).json({ message: "Holiday not found" });
    }

    await holiday.update({ status: "inactive", updatedBy });
    res.json({ message: "Holiday deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting holiday", error: err.message });
  }
};