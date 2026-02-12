// routes/auth.js
const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/requireAuth");
const {
  login,
  googleLogin,
  logout,
  me,
  forgotPassword,     // ← new
  resetPassword,      // ← new
} = require("../controllers/authController");

// Public routes
router.post("/login", login);
router.post("/google-login", googleLogin);
router.post("/forgot-password", forgotPassword);     // ← new
router.post("/reset-password/:token", resetPassword); // ← new

// Protected routes
router.get("/me", requireAuth, me);
router.post("/logout", requireAuth, logout);

module.exports = router;