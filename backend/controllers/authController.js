const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const db = require("../models");

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
exports.login = async (req, res) => {
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

    const passwordOk = await bcrypt.compare(password, user.password);
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
exports.googleLogin = async (req, res) => {
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
exports.me = async (req, res) => {
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
exports.logout = (req, res) => {
  res.clearCookie("access_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
  });

  res.json({ message: "Logged out" });
};
