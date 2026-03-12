const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Get notifications for user
router.get("/:user_id", async (req, res) => {
  const { user_id } = req.params;

  const [rows] = await db.query(
    `SELECT * FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [user_id]
  );

  res.json(rows);
});

// Mark as read
router.put("/read/:id", async (req, res) => {
  const { id } = req.params;

  await db.query(
    `UPDATE notifications SET is_read = TRUE WHERE id = ?`,
    [id]
  );

  res.json({ message: "Notification marked as read" });
});

// Get unread notification count
router.get("/unread/count/:user_id", async (req, res) => {
  const { user_id } = req.params;

  const [rows] = await db.query(
    `SELECT COUNT(*) AS unread_count
     FROM notifications
     WHERE user_id = ? AND is_read = FALSE`,
    [user_id]
  );

  res.json({ unread_count: rows[0].unread_count });
});

module.exports = router;