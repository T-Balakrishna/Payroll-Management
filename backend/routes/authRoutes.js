const express = require("express");
const router = express.Router();

const requireAuth = require("../middleware/requireAuth");
const {
  login,
  googleLogin,
  logout,
  me
} = require("../controllers/authController");

// public routes
router.post("/login", login);
router.post("/google-login", googleLogin);

// protected routes
router.get("/me", requireAuth, me);
router.post("/logout", requireAuth, logout);

module.exports = router;
