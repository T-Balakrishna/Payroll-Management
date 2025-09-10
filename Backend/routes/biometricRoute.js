const express = require("express");
const router = express.Router();
const biometricController = require("../controllers/biometricController");

// CRUD APIs
router.post("/", biometricController.createBiometric);
router.get("/", biometricController.getAllBiometrics);
router.get("/:id", biometricController.getBiometricById);
router.put("/:id", biometricController.updateBiometric);
router.delete("/:id", biometricController.deleteBiometric);

module.exports = router;
