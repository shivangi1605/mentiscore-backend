const express = require("express");
const router = express.Router();
const { auth, db } = require("../config/firebase");

router.post("/make-admin", async (req, res) => {
  try {
    const { email, password, first_name = "Admin", last_name = "User" } = req.body || {};

    const user = await auth.createUser({ email, password });

    await db.collection("users").doc(user.uid).set({
      email,
      role: "admin",
      auth_provider: "email",
      profileStatus: "approved",
      status: "active",
      first_name,
      last_name,
      student_id: null,
      counselor_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    res.status(201).json({ message: "Admin created", auth_id: user.uid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create admin" });
  }
});

module.exports = router;