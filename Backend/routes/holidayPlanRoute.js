const express = require("express");
const router = express.Router();
const holidayPlanController = require("../controllers/holidayPlanController");

// Holiday Plan routes
router.get("/", holidayPlanController.getAllHolidayPlans);
router.post("/", holidayPlanController.createHolidayPlan);
router.put("/:id", holidayPlanController.updateHolidayPlan);
router.delete("/:id", holidayPlanController.deleteHolidayPlan);

module.exports = router;