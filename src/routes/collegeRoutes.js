const express = require("express");
const router = express.Router();
// const db = require("../config/db"); /

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM colleges ORDER BY college_id ASC"
    );
    res.json(rows);
  } catch (err) {
    if (err && err.code === "ER_NO_SUCH_TABLE") {
      return res.json([]);
    }
    console.error("getColleges error:", err);
    res.status(500).json({ message: "Failed to fetch colleges" });
  }
});

module.exports = router;
