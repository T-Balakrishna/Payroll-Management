// routes/auth.js
import express from "express";
const router = express.Router();
import requireAuth from "../middleware/requireAuth.js";
import {
  login,
  googleLogin,
  logout,
  me,
  forgotPassword,     // ← new
  resetPassword,      // ← new
} from "../controllers/authController.js";
// Public routes
router.post("/login", login);
router.post("/google-login", googleLogin);
router.post("/forgot-password", forgotPassword);     // ← new
router.post("/reset-password/:token", resetPassword); // ← new

// Protected routes
router.get("/me", requireAuth, me);
router.post("/logout", requireAuth, logout);

export default router;