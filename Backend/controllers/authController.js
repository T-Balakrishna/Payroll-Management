const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Normal login
exports.loginUser = async (req, res) => {
  try {
    const { userMail, password } = req.body;
    const user = await User.findOne({ where: { userMail } });
    if (!user) return res.status(404).json({ msg: "User not found" });

    // TODO: replace with bcrypt.compare
    if (user.password !== password) return res.status(401).json({ msg: "Invalid password" });

    const token = jwt.sign(
      { id: user.id, email: user.userMail, role: user.role || "User" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ msg: "Login success", token, role: user.role || "User" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// Google login
exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body; // frontend sends Google ID token

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    let user = await User.findOne({ where: { userMail: email } });
    if (!user) {
      user = await User.create({
        userMail: email,
        userName: name,
        profilePic: picture,
        status: "active",
        role: "User", // default role
      });
    }

    const ourToken = jwt.sign(
      { id: user.id, email: user.userMail, role: user.role || "User" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ msg: "Google login success", token: ourToken, role: user.role || "User" });
  } catch (err) {
    console.error(err);
    res.status(401).json({ msg: "Invalid Google token" });
  }
};
