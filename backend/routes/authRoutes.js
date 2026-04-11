const express = require('express');
const router = express.Router();
const { studentEmailLogin, adminLogin, getMe } = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/student-login', studentEmailLogin);
router.post('/admin-login', adminLogin);
router.get('/me', auth, getMe);

module.exports = router;
