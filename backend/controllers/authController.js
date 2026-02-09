const jwt = require("jsonwebtoken");

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

    // TODO: Replace with real DB lookup
    const user = {
      id: 1,
      role: "Admin"
    };

    // TODO: Add password check (bcrypt)

    const token = createToken({
      id: user.id,
      role: user.role
    });

    setTokenCookie(res, token);

    res.json({
      message: "Login success",
      role: user.role
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

    // TODO: Verify Google token properly
    const user = {
      id: 2,
      role: "User"
    };

    const token = createToken({
      id: user.id,
      role: user.role
    });

    setTokenCookie(res, token);

    res.json({
      message: "Google login success",
      role: user.role
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
