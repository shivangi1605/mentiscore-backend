const express = require('express');
const router = express.Router();
const { verifyToken, allowRoles } = require('../middleware/authMiddleware');

router.get(
  '/dashboard',
  verifyToken,
  allowRoles('admin'),
  (req, res) => {
    res.json({ message: "Welcome Admin" });
  }
);

module.exports = router;