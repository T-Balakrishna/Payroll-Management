const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const nodemailer = require('nodemailer');
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const User = require("../models/User");
const ResetToken = require("../models/ResetToken"); // Import new model

// Google OAuth client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});
const sendEmail = async (to, subject, text) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Email sending failed:', error);
  }
};

// 🔹 Login with email OR userNumber
exports.loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password)
      return res.status(400).json({ msg: "Enter email/userNumber & password" });

    const user = await User.findOne({
      where: { [Op.or]: [{ userMail: identifier }, { userNumber: identifier }] }
    });

    if (!user) return res.status(404).json({ msg: "User not found" });
    if (user.status !== "active") return res.status(403).json({ msg: "User is inactive" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ msg: "Invalid password" });

    const token = jwt.sign(
      { id: user.userId, email: user.userMail, userNumber: user.userNumber, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ msg: "Login success", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message });
  }
};

// 🔹 Google OAuth2 login
exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ msg: "Google token required" });

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { email } = ticket.getPayload();

    const user = await User.findOne({ where: { userMail: email } });
    if (!user) return res.status(403).json({ msg: "User not registered with system" });
    if (user.status !== "active") return res.status(403).json({ msg: "User is inactive" });

    const ourToken = jwt.sign(
      { id: user.userId, email: user.userMail, userNumber: user.userNumber, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ msg: "Google login success", token: ourToken });
  } catch (err) {
    console.error(err);
    res.status(401).json({ msg: "Invalid Google token" });
  }
};

// 🔹 Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: "Email is required" });

    const user = await User.findOne({ where: { userMail: email } });
    if (!user) return res.status(404).json({ msg: "User not found" });
    if (user.status !== "active") return res.status(403).json({ msg: "User is inactive" });

    // Generate reset token
    const resetToken = jwt.sign(
      { id: user.userId, email: user.userMail },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // Store token in database
    await ResetToken.create({
      userId: user.userId,
      token: resetToken,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
    });

    // Create reset link
    const resetLink = `http://localhost:5173/reset-password/${resetToken}`;

    // Send email
    await sendEmail(
      user.userMail,
      "Password Reset Request",
      `Dear ${user.firstName || "User"},\n\nClick the following link to reset your password:\n${resetLink}\n\nThis link will expire in 15 minutes.\n\nIf you did not request a password reset, please ignore this email.`
    );

    res.json({ msg: "Password reset link sent to your email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to send reset link" });
  }
};

// 🔹 Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword)
      return res.status(400).json({ msg: "Token and new password are required" });

    // Verify token
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ msg: "Invalid or expired token" });
    }

    // Find token in database
    const resetToken = await ResetToken.findOne({ where: { token, userId: payload.id } });
    if (!resetToken) return res.status(400).json({ msg: "Invalid or expired token" });

    // Check token expiration
    if (resetToken.expiresAt < new Date()) {
      await resetToken.destroy();
      return res.status(400).json({ msg: "Token has expired" });
    }

    // Find user
    const user = await User.findOne({ where: { userId: payload.id } });
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword });

    // Delete used token
    await resetToken.destroy();

    res.json({ msg: "Password reset successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to reset password" });
  }
};