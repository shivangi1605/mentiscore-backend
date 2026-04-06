const { auth, db } = require("../config/firebase");

const usersCollection = db.collection("users");
const bookingsCollection = db.collection("bookings");
const logsCollection = db.collection("activity_logs");

exports.getUserById = async (req, res) => {
  try {
    const doc = await usersCollection.doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ message: "User not found" });
    return res.json({ auth_id: doc.id, ...doc.data() });
  } catch (err) {
    console.error("getUserById error:", err);
    return res.status(500).json({ message: "Failed to fetch user" });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const snapshot = await usersCollection.orderBy("createdAt", "desc").get();

    const rows = snapshot.docs.map((doc) => ({
      auth_id: doc.id,
      ...doc.data(),
    }));

    return res.json(rows);
  } catch (err) {
    console.error("getAllUsers error:", err);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
};

exports.approveUser = async (req, res) => {
  const authId = req.params.auth_id;

  if (!authId) {
    return res.status(400).json({ message: "Invalid auth_id" });
  }

  try {
    const ref = usersCollection.doc(authId);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    await ref.update({
      profileStatus: "approved",
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await logsCollection.add({
      action: "approve_user",
      module: "admin",
      reference_id: authId,
      performed_by: req.user.auth_id,
      created_at: new Date().toISOString(),
    });

    return res.json({ message: "User approved successfully" });
  } catch (err) {
    console.error("approveUser error:", err);
    return res.status(500).json({ message: "Failed to approve user" });
  }
};

exports.addCounselor = async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ message: "name, email, and password are required" });
  }

  try {
    const firebaseUser = await auth.createUser({
      email,
      password,
    });

    const parts = String(name).trim().split(/\s+/);
    const first = parts[0] || "Counselor";
    const last = parts.slice(1).join(" ") || "User";

    await usersCollection.doc(firebaseUser.uid).set({
      email,
      role: "counselor",
      auth_provider: "email",
      profileStatus: "approved",
      status: "active",
      first_name: first,
      last_name: last,
      student_id: null,
      counselor_id: firebaseUser.uid,
      approval_status: "approved",
      approved_by: req.user.auth_id,
      approved_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return res.status(201).json({
      message: "Counselor added",
      user_id: firebaseUser.uid,
      name,
      email,
      role: "counselor",
    });
  } catch (err) {
    console.error("addCounselor error:", err);
    if (err.code === "auth/email-already-exists") {
      return res.status(400).json({ message: "Email already exists" });
    }
    return res.status(500).json({ message: "Failed to add counselor" });
  }
};

exports.deleteCounselor = async (req, res) => {
  const userId = req.params.user_id;

  try {
    const ref = usersCollection.doc(userId);
    const doc = await ref.get();

    if (!doc.exists || doc.data().role !== "counselor") {
      return res.status(404).json({ message: "Counselor not found" });
    }

    await ref.update({
      is_deleted: true,
      updated_at: new Date().toISOString(),
    });

    return res.json({ message: "Counselor deleted" });
  } catch (err) {
    console.error("deleteCounselor error:", err);
    return res.status(500).json({ message: "Failed to delete counselor" });
  }
};

exports.getAllSessions = async (req, res) => {
  try {
    const snapshot = await bookingsCollection.orderBy("booked_at", "desc").get();
    const rows = snapshot.docs.map((doc) => ({
      booking_id: doc.id,
      ...doc.data(),
    }));
    return res.json(rows);
  } catch (err) {
    console.error("getAllSessions error:", err);
    return res.status(500).json({ message: "Failed to fetch sessions" });
  }
};

exports.getStats = async (req, res) => {
  try {
    const usersSnap = await usersCollection.get();
    const bookingsSnap = await bookingsCollection.get();

    let students = 0;
    let counselors = 0;
    let admins = 0;
    let pendingSessions = 0;

    usersSnap.forEach((doc) => {
      const role = doc.data().role;
      if (role === "student") students++;
      if (role === "counselor") counselors++;
      if (role === "admin") admins++;
    });

    bookingsSnap.forEach((doc) => {
      if (doc.data().status === "pending") pendingSessions++;
    });

    return res.json({
      students,
      counselors,
      admins,
      totalSessions: bookingsSnap.size,
      pendingSessions,
    });
  } catch (err) {
    console.error("getStats error:", err);
    return res.status(500).json({ message: "Failed to fetch stats" });
  }
};

exports.getActivityLogs = async (req, res) => {
  try {
    const snapshot = await logsCollection.orderBy("created_at", "desc").get();
    const rows = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return res.json(rows);
  } catch (err) {
    console.error("getActivityLogs error:", err);
    return res.status(500).json({ message: "Failed to fetch logs" });
  }
};