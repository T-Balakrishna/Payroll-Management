const express = require("express");
const router = express.Router();
const punchController = require("../controllers/punchController");

// Fetch new punches from biometric
router.get("/", punchController.fetchPunches);
router.get("/get", punchController.getPunches);

// Get today’s punches (all employees)
router.get("/today", punchController.getTodayPunches);

// Get all punches for a user by biometricId
router.get("/user/:bioNumber", punchController.getPunchesById);

module.exports = router;
