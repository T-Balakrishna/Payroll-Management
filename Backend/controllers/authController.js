const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const User = require("../models/User");

// Google OAuth client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 🔹 Login with email OR userNumber
exports.loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password)
      return res.status(400).json({ msg: "Enter email/userNumber & password" });

    // Find user by email OR userNumber
    const user = await User.findOne({
      where: {
        [Op.or]: [{ userMail: identifier }, { userNumber: identifier }]
      }
    });

    if (!user) return res.status(404).json({ msg: "User not found" });
    if (user.status !== "active") return res.status(403).json({ msg: "User is inactive" });

    // Compare password using bcrypt
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ msg: "Invalid password" });

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.userId,
        email: user.userMail,
        userNumber: user.userNumber,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ msg: "Login success", token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message });
  }
};

// 🔹 Google OAuth2 login (ONLY existing + active users)
exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) return res.status(400).json({ msg: "Google token required" });

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email } = payload;

    // 🔹 Check if user exists
    const user = await User.findOne({ where: { userMail: email } });

    if (!user) return res.status(403).json({ msg: "User not registered with system" });
    if (user.status !== "active") return res.status(403).json({ msg: "User is inactive" });

    // 🔹 Generate JWT if user exists & active
    const ourToken = jwt.sign(
      { id: user.userId, email: user.userMail, userNumber: user.userNumber, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ msg: "Google login success", token: ourToken, user });
  } catch (err) {
    console.error(err);
    res.status(401).json({ msg: "Invalid Google token" });
  }
};
