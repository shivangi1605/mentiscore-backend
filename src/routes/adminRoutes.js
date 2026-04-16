const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

router.get(
  '/dashboard',
  verifyToken,
  requireRole(['admin', 'college_admin']),
  adminController.getDashboard
);

router.get(
  '/users',
  verifyToken,
  requireRole(['admin', 'college_admin']),
  adminController.getUsers
);

router.put(
  '/approve-user/:auth_id',
  verifyToken,
  requireRole(['admin', 'college_admin']),
  adminController.approveUser
);

router.delete(
  '/user/:auth_id',
  verifyToken,
  requireRole(['admin']),
  adminController.deleteUser
);

router.post(
  '/counselors',
  verifyToken,
  requireRole(['admin']),
  adminController.addCounselor
);

router.delete(
  '/counselors/:user_id',
  verifyToken,
  requireRole(['admin']),
  adminController.deleteCounselor
);

router.get(
  '/sessions',
  verifyToken,
  requireRole(['admin', 'college_admin']),
  adminController.getAllSessions
);

router.get(
  '/logs',
  verifyToken,
  requireRole(['admin', 'college_admin']),
  adminController.getActivityLogs
);

router.get(
  '/stats',
  verifyToken,
  requireRole(['admin', 'college_admin']),
  adminController.getStats
);

module.exports = router;