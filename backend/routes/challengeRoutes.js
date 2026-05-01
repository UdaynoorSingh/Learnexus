const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getChallenges,
  submitChallenge
} = require('../controllers/challengeController');

router.get('/', auth, getChallenges);

router.post('/submit', auth, submitChallenge);

module.exports = router;
