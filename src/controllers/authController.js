//authController.js
const db = require('../config/db');
const { hashPassword } = require('../utils/password');
const bcrypt = require('bcrypt');
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
//const Student = require("../models/studentModel"); // use your actual model file

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email } = payload;

    // 1️⃣ Check if user already exists
    const [rows] = await db.query(
      "SELECT * FROM users_auth WHERE email = ?",
      [email]
    );

    let user;

    if (rows.length === 0) {
      // 2️⃣ If not, create Google user
      const [result] = await db.query(
        `INSERT INTO users_auth
         (role, email, password_hash, auth_provider, profile_status)
         VALUES ('student', ?, NULL, 'google', 'approved')`,
        [email]
      );

      const [newUserRows] = await db.query(
        "SELECT * FROM users_auth WHERE auth_id = ?",
        [result.insertId]
      );

      user = newUserRows[0];
    } else {
      user = rows[0];
    }

    // 3️⃣ Generate token EXACTLY like normal login
    const appToken = jwt.sign(
      { auth_id: user.auth_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Google login successful",
      token: appToken,
    });

  } catch (error) {
    console.error("Google login error:", error);
    return res.status(400).json({ message: "Invalid Google token" });
  }
};
exports.studentSignup = async (req, res) => {
  try {
    const { email, password } = req.body;

    const [existing] = await db.query(
      "SELECT auth_id FROM users_auth WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await hashPassword(password);

    const [result] = await db.query(
      `INSERT INTO users_auth
       (role, email, password_hash, auth_provider, profile_status)
       VALUES ('student', ?, ?, 'email', 'incomplete')`,
      [email, hashedPassword]
    );

    return res.status(201).json({
      message: "Account created. Complete your profile.",
      auth_id: result.insertId
    });

  } catch (error) {
    console.error("Signup Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Check if user exists
    const [rows] = await db.query(
      "SELECT * FROM users_auth WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const user = rows[0];

    // 2️⃣ Compare password
if (!user.password_hash) {
  return res.status(400).json({
    message: "This account uses Google login. Please sign in with Google."
  });
}

const isMatch = await bcrypt.compare(password, user.password_hash);

    // 3️⃣ Block if not approved
    if (user.profile_status !== 'approved') {
      return res.status(403).json({
        message: `Account ${user.profile_status}. Access denied.`
      });
    }

    // 4️⃣ Generate token
    const token = jwt.sign(
      { auth_id: user.auth_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Login successful",
      token
    });

  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};