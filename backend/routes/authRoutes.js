const express = require('express');
const router = express.Router();
const { studentRequestOtp, studentVerifyOtp, adminLogin, getMe } = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/student-request-otp', studentRequestOtp);
router.post('/student-verify-otp', studentVerifyOtp);
router.post('/admin-login', adminLogin);
router.get('/me', auth, getMe);

module.exports = router;
