// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.studentSignup);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.post('/admin/login', authController.adminLogin);

module.exports = router;