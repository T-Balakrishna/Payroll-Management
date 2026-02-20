import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import db from '../models/index.js';
import { sendMail } from "../services/mailService.js";
import crypto from "crypto";
import { Op } from "sequelize";
import { hashPassword, verifyPassword } from "../utils/password.js";
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

/**
 * Utility: create JWT
 */
const createToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "15m"
  });
};

/**
 * Utility: set HttpOnly cookie
 */
const setTokenCookie = (res, token) => {
  res.cookie("access_token", token, {
    httpOnly: true,            // 🔒 JS cannot access
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 15 * 60 * 1000     // 15 minutes
  });
};

/**
 * @route   POST /api/auth/login
 * @desc    Email/UserNumber + password login
 */
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ msg: "Missing credentials" });
    }

    const user = await db.User.findOne({
      where: {
        [db.Sequelize.Op.or]: [
          { userMail: identifier },
          { userNumber: identifier }
        ]
      },
      include: [
        {
          model: db.Role,
          as: "role",
          attributes: ["roleId", "roleName"]
        }
      ]
    });

    if (!user) {
      return res.status(401).json({ msg: "Invalid credentials" });
    }

    if (user.status && user.status !== "Active") {
      return res.status(403).json({ msg: "User is inactive" });
    }

    const passwordOk = await verifyPassword(password, user.password);
    if (!passwordOk) {
      return res.status(401).json({ msg: "Invalid credentials" });
    }

    const roleName = user.role?.roleName || "User";

    const token = createToken({
      id: user.userId,
      roleId: user.roleId,
      role: roleName
    });

    setTokenCookie(res, token);

    res.json({
      message: "Login success",
      role: roleName,
      token
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

/**
 * @route   POST /api/auth/google-login
 * @desc    Google OAuth login
 */
export const googleLogin = async (req, res) => {
  try {
    const { token: googleToken } = req.body;

    if (!googleToken) {
      return res.status(400).json({ msg: "Google token missing" });
    }

    if (!googleClient) {
      return res.status(500).json({ msg: "Google login not configured" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: googleToken,
      audience: googleClientId
    });

    const payload = ticket.getPayload();
    const googleId = payload?.sub;
    const email = payload?.email;
    const firstName = payload?.given_name || null;
    const lastName = payload?.family_name || null;
    const picture = payload?.picture || null;

    if (!googleId || !email) {
      return res.status(400).json({ msg: "Invalid Google token" });
    }

    const user = await db.User.findOne({
      where: { userMail: email },
      include: [
        {
          model: db.Role,
          as: "role",
          attributes: ["roleId", "roleName"]
        }
      ]
    });

    if (!user) {
      return res.status(401).json({ msg: "No user found for this Google account" });
    }

    if (user.status && user.status !== "Active") {
      return res.status(403).json({ msg: "User is inactive" });
    }

    await db.GoogleAuth.upsert({
      googleId,
      email,
      firstName,
      lastName,
      profilePic: picture,
      lastLogin: new Date(),
      userId: user.userId
    });

    const roleName = user.role?.roleName || "User";

    const token = createToken({
      id: user.userId,
      roleId: user.roleId,
      role: roleName
    });

    setTokenCookie(res, token);

    res.json({
      message: "Google login success",
      role: roleName,
      token
    });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get logged-in user info
 */
export const me = async (req, res) => {
  try {
    // requireAuth middleware already verified token
    res.json({
      id: req.user.id,
      role: req.user.role
    });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Clear HttpOnly cookie
 */
export const logout = (req, res) => {
  res.clearCookie("access_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
  });

  res.json({ message: "Logged out" });
};

/**
 * @route POST /api/auth/forgot-password
 * @desc Send password reset link to email
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ msg: "Email is required" });
    }

    const user = await db.User.findOne({
      where: { userMail: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if email exists (security)
      return res.status(200).json({ msg: "If the email exists, a reset link has been sent" });
    }

    // Delete any old reset tokens
    await db.ResetToken.destroy({
      where: { userId: user.userId },
    });

    // Create new reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.ResetToken.create({
      userId: user.userId,
      token: hashedToken,
      expiresAt,
    });

    // Send email (nodemailer example - configure your transporter)
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; line-height:1.6;">
        <h2>Password Reset Request</h2>
        <p>Hello ${user.userName || "User"},</p>
        <p>We received a request to reset your password.</p>
        <p>
          Click the button below to reset your password:
        </p>
        <p>
          <a href="${resetUrl}" 
            style="display:inline-block;
                    padding:10px 20px;
                    background-color:#2563eb;
                    color:#ffffff;
                    text-decoration:none;
                    border-radius:5px;">
            Reset Password
          </a>
        </p>
        <p>This link will expire in <strong>1 hour</strong>.</p>
        <p>If you did not request this, please ignore this email.</p>
        <br/>
        <p>Regards,<br/>Support Team</p>
      </div>
    `;

    await sendMail({
      to: email,
      subject: "Password Reset Request",
      html: emailHtml,
    });


    res.status(200).json({ msg: "If the email exists, a reset link has been sent" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

/**
 * @route POST /api/auth/reset-password/:token
 * @desc Reset password using token
 */
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.status(400).json({ msg: "Password and confirmation required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ msg: "Passwords do not match" });
    }

    if (password.length < 8) {
      return res.status(400).json({ msg: "Password must be at least 8 characters" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const resetToken = await db.ResetToken.findOne({
      where: {
        token: hashedToken,
        expiresAt: { [Op.gt]: new Date() },
      },
      include: [{ model: db.User, as: "user" }],
    });

    if (!resetToken) {
      return res.status(400).json({ msg: "Invalid or expired token" });
    }

    const user = resetToken.user;

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update user password
    await user.update({ password: hashedPassword });

    // Delete used token
    await resetToken.destroy();

    res.status(200).json({ msg: "Password reset successful. Please log in." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};
