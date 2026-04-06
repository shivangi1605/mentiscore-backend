const express = require('express');
const router = express.Router();
const { verifyToken, allowRoles } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

router.get('/', verifyToken, allowRoles('admin'), adminController.getAllUsers);
router.get('/:id', verifyToken, allowRoles('admin'), adminController.getUserById);

module.exports = router;
