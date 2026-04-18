const express = require('express');
const router = express.Router();
const { teach, chat, flashcards, examGenerate, youtubeEmbed, mindmap, podcast, taskIdeas, nexGuide } = require('../controllers/aiController');
const auth = require('../middleware/auth');
const requireVerified = require('../middleware/verified');

router.use(auth);
router.use(requireVerified);

router.post('/nex-guide', nexGuide);
router.post('/task-ideas', taskIdeas);
router.post('/teach', teach);
router.post('/chat', chat);
router.post('/flashcards', flashcards);
router.post('/exam/generate', examGenerate);
router.post('/youtube/embed', youtubeEmbed);
router.post('/mindmap', mindmap);
router.post('/podcast', podcast);

module.exports = router;
