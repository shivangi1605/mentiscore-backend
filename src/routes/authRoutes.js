const express = require('express');
const router = express.Router();
const { studentSignup, login, googleLogin } = require('../controllers/authController');
router.post('/google', googleLogin);
router.post('/student/signup', studentSignup);
router.post('/login', login);
module.exports = router;