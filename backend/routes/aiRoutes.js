const express = require('express');
const router = express.Router();
const { teach, chat, flashcards, examGenerate } = require('../controllers/aiController');
const auth = require('../middleware/auth');

// All AI proxy routes strictly require the user to be authenticated
router.use(auth);

router.post('/teach', teach);
router.post('/chat', chat);
router.post('/flashcards', flashcards);
router.post('/exam/generate', examGenerate);

module.exports = router;
