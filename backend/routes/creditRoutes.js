const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getBalance, getHistory } = require('../controllers/creditController');

router.get('/balance', auth, getBalance);
router.get('/history', auth, getHistory);

module.exports = router;
