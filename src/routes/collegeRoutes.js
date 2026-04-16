const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");

// Public: Get active colleges
router.get("/", async (req, res) => {
  try {
    const snapshot = await db.collection("colleges").where("is_active", "==", true).get();
    const colleges = snapshot.docs.map(doc => ({ college_id: doc.id, ...doc.data() }));
    return res.json(colleges);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch colleges" });
  }
});

// Admin: Create college
router.post("/", verifyToken, requireRole(["admin"]), async (req, res) => {
  try {
    const { name, city, state, collegeCode } = req.body;
    if (!name || !collegeCode) return res.status(400).json({ message: "Name and collegeCode required" });
    
    const docRef = db.collection("colleges").doc();
    await docRef.set({
      name, city, state, collegeCode,
      is_active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return res.status(201).json({ message: "College created", college_id: docRef.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to create college" });
  }
});

// Admin: Update college
router.put("/:id", verifyToken, requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updatedAt: new Date().toISOString() };
    await db.collection("colleges").doc(id).update(updates);
    return res.json({ message: "College updated" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to update college" });
  }
});

// Admin: Soft delete college
router.delete("/:id", verifyToken, requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("colleges").doc(id).update({ is_active: false, updatedAt: new Date().toISOString() });
    return res.json({ message: "College disabled" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to delete college" });
  }
});

module.exports = router;