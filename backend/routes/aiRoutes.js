const express = require('express');
const router = express.Router();
const { teach, chat } = require('../controllers/aiController');
const auth = require('../middleware/auth');

// All AI proxy routes strictly require the user to be authenticated
router.use(auth);

router.post('/teach', teach);
router.post('/chat', chat);

module.exports = router;
