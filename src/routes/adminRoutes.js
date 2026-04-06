const express = require('express');
const router = express.Router();
const { verifyToken, allowRoles } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

router.get(
  '/dashboard',
  verifyToken,
  allowRoles('admin'),
  (req, res) => {
    res.json({ message: "Welcome Admin" });
  }
);

router.get('/users', verifyToken, allowRoles('admin'), adminController.getAllUsers);
router.post('/counselors', verifyToken, allowRoles('admin'), adminController.addCounselor);
router.delete('/counselors/:user_id', verifyToken, allowRoles('admin'), adminController.deleteCounselor);
router.get('/sessions', verifyToken, allowRoles('admin'), adminController.getAllSessions);
router.get('/logs', verifyToken, allowRoles('admin'), adminController.getActivityLogs);
router.get('/stats', verifyToken, allowRoles('admin'), adminController.getStats);
router.put('/approve-user/:auth_id', verifyToken, allowRoles('admin'), adminController.approveUser);

module.exports = router;
