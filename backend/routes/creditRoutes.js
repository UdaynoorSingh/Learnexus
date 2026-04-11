const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireVerified = require('../middleware/verified');
const { getBalance, getHistory } = require('../controllers/creditController');

router.get('/balance', auth, requireVerified, getBalance);
router.get('/history', auth, requireVerified, getHistory);

module.exports = router;
