const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

router.get('/', verifyToken, requireRole(['admin', 'college_admin']), adminController.getUsers);

module.exports = router;