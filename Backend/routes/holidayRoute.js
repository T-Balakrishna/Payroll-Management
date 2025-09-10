const express = require("express");
const router = express.Router();
const holidayController = require("../controllers/holidayController");

// Holiday routes
router.post("/", holidayController.addHoliday);
router.get("/:planId", holidayController.getHolidaysByPlan);
router.put("/:id", holidayController.updateHoliday);
router.delete("/:id", holidayController.deleteHoliday);

module.exports = router;