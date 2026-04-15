const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");
const { verifyToken, allowRoles } = require("../middleware/authMiddleware");

const collegesCollection = db.collection("colleges");

// GET all colleges (public)
router.get("/", async (req, res) => {
  try {
    const snapshot = await collegesCollection.where("is_active", "==", true).get();
    const colleges = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.json(colleges);
  } catch (err) {
    console.error("getColleges error:", err);
    return res.status(500).json({ message: "Failed to fetch colleges" });
  }
});

// GET single college
router.get("/:id", async (req, res) => {
  try {
    const doc = await collegesCollection.doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ message: "College not found" });
    return res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch college" });
  }
});

// POST create college (admin only)
router.post("/", verifyToken, allowRoles("admin"), async (req, res) => {
  try {
    const { name, city, state, address, email, phone } = req.body;
    if (!name) return res.status(400).json({ message: "College name is required" });

    const ref = await collegesCollection.add({
      name, city: city || "", state: state || "",
      address: address || "", email: email || "", phone: phone || "",
      is_active: true,
      createdAt: new Date().toISOString(),
      createdBy: req.user?.auth_id || "admin",
    });

    return res.status(201).json({ message: "College created", id: ref.id });
  } catch (err) {
    console.error("createCollege error:", err);
    return res.status(500).json({ message: "Failed to create college" });
  }
});

// PUT update college (admin only)
router.put("/:id", verifyToken, allowRoles("admin"), async (req, res) => {
  try {
    const ref = collegesCollection.doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ message: "College not found" });

    const { name, city, state, address, email, phone, is_active } = req.body;
    await ref.update({
      ...(name !== undefined && { name }),
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(address !== undefined && { address }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(is_active !== undefined && { is_active }),
      updatedAt: new Date().toISOString(),
    });

    return res.json({ message: "College updated" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update college" });
  }
});

// DELETE (soft delete) college (admin only)
router.delete("/:id", verifyToken, allowRoles("admin"), async (req, res) => {
  try {
    const ref = collegesCollection.doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ message: "College not found" });

    await ref.update({ is_active: false, deletedAt: new Date().toISOString() });
    return res.json({ message: "College removed" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete college" });
  }
});

module.exports = router;