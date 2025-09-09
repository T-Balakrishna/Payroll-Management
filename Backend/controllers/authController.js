const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const User = require("../models/User");

// Google OAuth client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 🔹 Create new user with hashed password
exports.createUser = async (req, res) => {
  try {
    const { userMail, userNumber, userName, password, role, departmentId, createdBy } = req.body;

    if (!userMail || !userNumber || !password)
      return res.status(400).json({ msg: "userMail, userNumber & password are required" });

    const existing = await User.findOne({ where: { userMail } });
    if (existing) return res.status(400).json({ msg: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      userMail,
      userNumber,
      userName,
      role: role || "Staff",
      departmentId: departmentId || 0,
      password: hashedPassword,
      createdBy,
      status: "active",
    });

    res.status(201).json({ msg: "User created", user: newUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message });
  }
};

// 🔹 Login with email OR userNumber
exports.loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password)
      return res.status(400).json({ msg: "Enter email/userNumber & password" });

    // Find user by email OR userNumber
    const user = await User.findOne({
      where: {
        [Op.or]: [{ userMail: identifier }, { userNumber: identifier }],
        status: "active",
      },
      raw: true,
    });

    if (!user) return res.status(404).json({ msg: "User not found" });

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
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1h" }
    );

    res.json({ msg: "Login success", token, user });
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

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    let user = await User.findOne({ where: { userMail: email } });

    // If user doesn't exist, create one with random password
    if (!user) {
      const randomPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = await User.create({
        userMail: email,
        userName: name,
        profilePic: picture,
        password: hashedPassword,
        status: "active",
        role: "Staff",
      });
    }

    const ourToken = jwt.sign(
      { id: user.userId, email: user.userMail, userNumber: user.userNumber, role: user.role },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1h" }
    );

    res.json({ msg: "Google login success", token: ourToken, user });
  } catch (err) {
    console.error(err);
    res.status(401).json({ msg: "Invalid Google token" });
  }
};
