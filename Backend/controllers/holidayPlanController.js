const  HolidayPlan  = require("../models/HolidayPlan");
const  Holiday  = require("../models/Holiday");
const { Op } = require("sequelize");

// 🔹 Helper: generate weekly offs for a plan
async function generateWeeklyOffs(holidayPlanId, weeklyOffs, updatedBy = "system", startDate, endDate) {
  const daysMap = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
    Thursday: 4, Friday: 5, Saturday: 6,
  };
  const chosenDays = weeklyOffs.map(d => daysMap[d.trim()]);

  // Build start = 01-06-startYear, end = 31-04-endYear
  const startYear = new Date(startDate).getFullYear();
  const endYear = new Date(endDate).getFullYear();

  const start = new Date(startYear, 5, 1);   // June = month 5 (0-indexed)
  const end = new Date(endYear, 3, 30);      // April = month 3, last day = 30
  let dayName =""
  const holidays = [];
for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
  if (chosenDays.includes(d.getDay())) {
    // Get day name from number
     dayName = Object.keys(daysMap).find(key => daysMap[key] === d.getDay());

    holidays.push({
      holidayPlanId,
      holidayDate: new Date(d),
      description: `Weekly Off - ${dayName}`,  // 👈 added weekday
      status: "active",
      createdBy: updatedBy,
    });
  }
}


  // hard delete old weekly offs before inserting
  await Holiday.destroy({
  where: {
    holidayPlanId,
    description: { [Op.like]: "Weekly Off%" }, // match "Weekly Off - Sunday", etc.
    status: "active"
  }
});

  await Holiday.bulkCreate(holidays);
}


// ================= CONTROLLER FUNCTIONS =================

// Create plan + generate weekly offs
exports.createHolidayPlan = async (req, res) => {
  try {
    const { holidayPlanName, weeklyOff, createdBy, startDate, endDate } = req.body;

    // 🔍 Check if plan already exists
    const existingPlan = await HolidayPlan.findOne({
      where: { holidayPlanName, startDate, endDate, status: "active" }
    });

    if (existingPlan) {
      return res.status(400).json({ message: "Holiday plan with same name and dates already exists" });
    }

    const newPlan = await HolidayPlan.create({
      holidayPlanName,
      weeklyOff,
      createdBy,
      startDate,
      endDate
    });

    await generateWeeklyOffs(newPlan.holidayPlanId, weeklyOff, createdBy, startDate, endDate);

    res.status(201).json(newPlan);
  } catch (err) {
    res.status(500).send("Error creating holiday plan: " + err.message);
  }
};


// Get all active plans
exports.getAllHolidayPlans = async (req, res) => {
  try {
    const plans = await HolidayPlan.findAll({ where: { status: "active" } });
    res.json(plans);
  } catch (err) {
    res.status(500).send("Error fetching holiday plans: " + err.message);
  }
};

// Edit only weeklyOffs → regenerate holidays
exports.updateHolidayPlan = async (req, res) => {
  try {
    const { holidayPlanName, weeklyOff, updatedBy, startDate, endDate } = req.body;
    const plan = await HolidayPlan.findByPk(req.params.id);

    if (!plan) return res.status(404).send("Holiday plan not found");

    await plan.update({ holidayPlanName, weeklyOff, updatedBy, startDate, endDate });

    // regenerate ONLY weekly offs, leave manual holidays untouched
    await generateWeeklyOffs(plan.holidayPlanId, weeklyOff, updatedBy, startDate, endDate);

    res.json(plan);
  } catch (err) {
    res.status(500).send("Error updating holiday plan: " + err.message);
  }
};


// Soft delete plan + deactivate its holidays
exports.deleteHolidayPlan = async (req, res) => {
  try {
    const plan = await HolidayPlan.findOne({
      where: { holidayPlanId: req.params.id, status: "active" },
    });
    if (!plan) return res.status(404).send("Holiday Plan not found");

    await plan.update({ status: "inactive", updatedBy: req.body.updatedBy });

    await Holiday.update(
      { status: "inactive", updatedBy: req.body.updatedBy },
      { where: { holidayPlanId: plan.holidayPlanId, status: "active" } }
    );

    res.json({ message: "Holiday Plan deactivated successfully" });
  } catch (err) {
    res.status(500).send("Error deleting holiday plan: " + err.message);
  }
};
