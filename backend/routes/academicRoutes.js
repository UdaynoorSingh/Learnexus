const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireVerified = require('../middleware/verified');
const {
  getDegrees,
  getBranches,
  getSemesters,
  getSubjects,
  getTopics,
  getTopic
} = require('../controllers/academicController');

router.use(auth, requireVerified);

router.get('/degrees', getDegrees);
router.get('/degrees/:degreeId/branches', getBranches);
router.get('/branches/:branchId/semesters', getSemesters);
router.get('/semesters/:semesterId/subjects', getSubjects);
router.get('/subjects/:subjectId/topics', getTopics);
router.get('/topics/:topicId', getTopic);

module.exports = router;
