const axios = require("axios");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { auth, db } = require("../config/firebase");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const usersCollection = db.collection("users");

const createToken = (user) =>
  jwt.sign(
    {
      auth_id: user.auth_id,
      role: user.role,
      email: user.email,
      college_id: user.college_id
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

const buildUserPayload = async (uid) => {
  const doc = await usersCollection.doc(uid).get();
  if (!doc.exists) return null;
  const user = doc.data();

  return {
    auth_id: uid,
    email: user.email ?? null,
    role: user.role ?? null,
    provider: user.provider ?? "email",
    status: user.status ?? "incomplete",
    profileStatus: user.profileStatus ?? "pending",
    college_id: user.college_id ?? "",
    createdAt: user.createdAt ?? null,
    student_id: user.student_id ?? null,
    counselor_id: user.counselor_id ?? null,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    phone: user.phone ?? null,
    department: user.department ?? null,
    current_year: user.current_year ?? null,
    enrollment_no: user.enrollment_no ?? null,
    gender: user.gender ?? null,
    dob: user.dob ?? null,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "User",
  };
};

exports.studentSignup = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    let firebaseUser;
    try {
      firebaseUser = await auth.createUser({ email, password });
    } catch (err) {
      if (err.code === "auth/email-already-exists") return res.status(400).json({ message: "Email already exists" });
      throw err;
    }

    await usersCollection.doc(firebaseUser.uid).set({
      auth_id: firebaseUser.uid,
      email,
      role: "student",
      provider: "email",
      status: "incomplete",
      profileStatus: "pending",
      college_id: "",
      firstName: "",
      lastName: "",
      phone: "",
      department: "",
      current_year: null,
      enrollment_no: "",
      gender: null,
      dob: null,
      student_id: firebaseUser.uid,
      counselor_id: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const userPayload = await buildUserPayload(firebaseUser.uid);
    const token = createToken(userPayload);

    return res.status(201).json({
      message: "Account created successfully",
      token,
      user: userPayload,
    });
  } catch (error) {
    console.error("studentSignup error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.counselorSignup = async (req, res) => {
  try {
    const { email, password, firstName, lastName, college_id, qualification, specialization, phone } = req.body || {};
    if (!email || !password || !firstName || !lastName || !college_id) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    let firebaseUser;
    try {
      firebaseUser = await auth.createUser({ email, password });
    } catch (err) {
      if (err.code === "auth/email-already-exists") return res.status(400).json({ message: "Email already exists" });
      throw err;
    }

    await usersCollection.doc(firebaseUser.uid).set({
      auth_id: firebaseUser.uid,
      email,
      role: "counselor",
      provider: "email",
      status: "active",
      profileStatus: "pending",
      college_id,
      firstName,
      lastName,
      phone: phone || null,
      qualification: qualification || null,
      specialization: specialization || null,
      experience_years: null,
      counselor_id: firebaseUser.uid,
      student_id: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return res.status(201).json({ message: "Counselor account created. Awaiting admin approval." });
  } catch (error) {
    console.error("counselorSignup error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    const firebaseRes = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_WEB_API_KEY}`,
      { email, password, returnSecureToken: true }
    );

    const uid = firebaseRes.data.localId;
    const userPayload = await buildUserPayload(uid);

    if (!userPayload) return res.status(404).json({ message: "User profile not found" });
    if (userPayload.profileStatus === "rejected") return res.status(403).json({ message: "Account rejected." });

    const token = createToken(userPayload);
    return res.json({ message: "Login successful", token, user: userPayload });
  } catch (error) {
    console.error("login error:", error.response?.data || error.message);
    return res.status(400).json({ message: "Invalid email or password" });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ message: "Google token is required" });

    const ticket = await client.verifyIdToken({ idToken: token, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const email = payload.email;
    const firstName = payload.given_name || "";
    const lastName = payload.family_name || "";

    let firebaseUser;
    try {
      firebaseUser = await auth.getUserByEmail(email);
    } catch (err) {
      firebaseUser = await auth.createUser({ email, emailVerified: true });
    }

    const userRef = usersCollection.doc(firebaseUser.uid);
    const existing = await userRef.get();

    if (!existing.exists) {
      await userRef.set({
        auth_id: firebaseUser.uid,
        email,
        role: "student",
        provider: "google",
        status: "incomplete",
        profileStatus: "pending",
        college_id: "",
        firstName,
        lastName,
        phone: "",
        department: "",
        current_year: null,
        enrollment_no: "",
        gender: null,
        dob: null,
        student_id: firebaseUser.uid,
        counselor_id: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const userPayload = await buildUserPayload(firebaseUser.uid);
    const appToken = createToken(userPayload);

    return res.json({ message: "Login successful", token: appToken, user: userPayload });
  } catch (error) {
    console.error("googleLogin error:", error);
    return res.status(400).json({ message: "Invalid Google token" });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });

    const firebaseRes = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_WEB_API_KEY}`,
      { email, password, returnSecureToken: true }
    );

    const uid = firebaseRes.data.localId;
    const userPayload = await buildUserPayload(uid);

    if (!userPayload || (userPayload.role !== "admin" && userPayload.role !== "college_admin")) {
      return res.status(403).json({ message: "Invalid admin credentials" });
    }

    const token = createToken(userPayload);
    return res.json({ message: "Admin login successful", token, user: userPayload });
  } catch (error) {
    console.error("adminLogin error:", error.response?.data || error.message);
    return res.status(400).json({ message: "Invalid admin credentials" });
  }
};