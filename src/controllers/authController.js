const axios = require("axios");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { auth, db, FieldValue } = require("../config/firebase");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const createToken = (user) =>
  jwt.sign(
    {
      auth_id: user.auth_id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

const usersCollection = db.collection("users");

const buildUserPayload = async (uid) => {
  const doc = await usersCollection.doc(uid).get();
  if (!doc.exists) return null;

  const user = doc.data();

  return {
    auth_id: uid,
    email: user.email,
    role: user.role,
    status: user.profileStatus || "incomplete",
    created_at: user.createdAt || null,
    student_id: user.studentId || null,
    counselor_id: user.counselorId || null,
    first_name: user.firstName || null,
    last_name: user.lastName || null,
    name:
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.email ||
      "User",
  };
};

exports.studentSignup = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    let firebaseUser;
    try {
      firebaseUser = await auth.createUser({
        email,
        password,
      });
    } catch (err) {
      if (err.code === "auth/email-already-exists") {
        return res.status(400).json({ message: "Email already exists" });
      }
      throw err;
    }

    await usersCollection.doc(firebaseUser.uid).set({
      email,
      role: "student",
      auth_provider: "email",
      profileStatus: "incomplete",
      status: "active",
      first_name: null,
      last_name: null,
      student_id: firebaseUser.uid,
      counselor_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return res.status(201).json({
      message: "Account created. Complete your profile.",
      auth_id: firebaseUser.uid,
    });
  } catch (error) {
    console.error("studentSignup error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const firebaseRes = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_WEB_API_KEY}`,
      {
        email,
        password,
        returnSecureToken: true,
      }
    );

    const uid = firebaseRes.data.localId;
    const userPayload = await buildUserPayload(uid);

    if (!userPayload) {
      return res.status(404).json({ message: "User profile not found" });
    }

    if (userPayload.status === "rejected") {
      return res.status(403).json({ message: "Account rejected. Access denied." });
    }

    const token = createToken({
      auth_id: uid,
      role: userPayload.role,
      email: userPayload.email,
    });

    return res.json({
      message: "Login successful",
      token,
      user: userPayload,
    });
  } catch (error) {
    console.error("login error:", error.response?.data || error.message);
    return res.status(400).json({ message: "Invalid email or password" });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body || {};

    if (!token) {
      return res.status(400).json({ message: "Google token is required" });
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const firstName = payload.given_name || "";
    const lastName = payload.family_name || "";

    let firebaseUser;
    try {
      firebaseUser = await auth.getUserByEmail(email);
    } catch (err) {
      firebaseUser = await auth.createUser({
        email,
        emailVerified: true,
      });
    }

    const userRef = usersCollection.doc(firebaseUser.uid);
    const existing = await userRef.get();

    if (!existing.exists) {
      await userRef.set({
        email,
        role: "student",
        auth_provider: "google",
        profileStatus: "incomplete",
        status: "active",
        first_name: firstName || null,
        last_name: lastName || null,
        student_id: firebaseUser.uid,
        counselor_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    const userPayload = await buildUserPayload(firebaseUser.uid);
    const appToken = createToken({
      auth_id: firebaseUser.uid,
      role: userPayload.role,
      email: userPayload.email,
    });

    return res.json({
      message: "Login successful",
      token: appToken,
      user: userPayload,
    });
  } catch (error) {
    console.error("googleLogin error:", error);
    return res.status(400).json({ message: "Invalid Google token" });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const firebaseRes = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_WEB_API_KEY}`,
      {
        email,
        password,
        returnSecureToken: true,
      }
    );

    const uid = firebaseRes.data.localId;
    const userPayload = await buildUserPayload(uid);

    if (!userPayload || userPayload.role !== "admin") {
      return res.status(403).json({ message: "Invalid admin credentials" });
    }

    const token = createToken({
      auth_id: uid,
      role: userPayload.role,
      email: userPayload.email,
    });

    return res.json({
      message: "Admin login successful",
      token,
      user: userPayload,
    });
  } catch (error) {
    console.error("adminLogin error:", error.response?.data || error.message);
    return res.status(400).json({ message: "Invalid admin credentials" });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const snapshot = await usersCollection.orderBy("createdAt", "desc").get();
    const users = snapshot.docs.map((doc) => ({
      auth_id: doc.id,
      ...doc.data(),
    }));
    return res.json(users);
  } catch (err) {
    console.error("getAllUsers error:", err);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
};