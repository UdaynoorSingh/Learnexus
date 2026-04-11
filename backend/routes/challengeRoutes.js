const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getChallenges,
  submitChallenge
} = require('../controllers/challengeController');

// Public: list all challenges (still requires auth for consistency)
router.get('/', auth, getChallenges);

// Protected: submit a solution
router.post('/submit', auth, submitChallenge);

module.exports = router;
