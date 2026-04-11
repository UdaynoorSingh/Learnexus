const express = require('express');
const router = express.Router();
const { listPublicColleges } = require('../controllers/collegeController');

router.get('/public', listPublicColleges);

module.exports = router;
