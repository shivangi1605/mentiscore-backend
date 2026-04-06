const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { verifyToken, allowRoles } = require('../middleware/authMiddleware');

/* CREATE student profile */
console.log("allowRoles:", allowRoles);
router.post(
  '/profile',
  verifyToken,
  allowRoles('student'),
  studentController.createStudentProfile
);

/* GET student profile */
router.get(
  '/profile/:auth_id',
  verifyToken,
  allowRoles('student'),
  studentController.getStudentProfile
);

/* UPDATE student profile */
router.put(
  '/profile/:auth_id',
  verifyToken,
  allowRoles('student'),
  studentController.updateStudentProfile
);

module.exports = router;