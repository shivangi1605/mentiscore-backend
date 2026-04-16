const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

/* CREATE student profile */
router.post(
  '/profile',
  verifyToken,
  requireRole(['student']),
  studentController.createStudentProfile
);

/* GET student profile */
router.get(
  '/profile/:auth_id',
  verifyToken,
  requireRole(['student']),
  studentController.getStudentProfile
);

/* UPDATE student profile */
router.put(
  '/profile/:auth_id',
  verifyToken,
  requireRole(['student']),
  studentController.updateStudentProfile
);

module.exports = router;