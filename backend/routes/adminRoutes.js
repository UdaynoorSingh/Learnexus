const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireVerified = require('../middleware/verified');
const rbac = require('../middleware/rbac');
const {
  getPendingNotes,
  verifyNote,
  deleteNote,
  createDegree,
  createBranch,
  createSemester,
  createSubject,
  createTopic,
  getAllNotes,
  getStats,
  getChartStats,
  getCollegesAdmin,
  createCollegeAdmin,
  updateCollegeAdmin,
  deleteCollegeAdmin,
  createChallenge,
  updateChallenge,
  deleteChallenge
} = require('../controllers/adminController');

router.use(auth);
router.use(requireVerified);
router.use(rbac('admin', 'superadmin'));

router.get('/stats', getStats);
router.get('/chart-stats', getChartStats);
router.get('/notes', getAllNotes);
router.get('/notes/pending', getPendingNotes);
router.put('/notes/:noteId/verify', verifyNote);
router.delete('/notes/:noteId', deleteNote);
router.post('/degrees', createDegree);
router.post('/branches', createBranch);
router.post('/semesters', createSemester);
router.post('/subjects', createSubject);
router.post('/topics', createTopic);

router.get('/colleges', getCollegesAdmin);
router.post('/colleges', createCollegeAdmin);
router.put('/colleges/:id', updateCollegeAdmin);
router.delete('/colleges/:id', deleteCollegeAdmin);

router.post('/challenges', createChallenge);
router.put('/challenges/:id', updateChallenge);
router.delete('/challenges/:id', deleteChallenge);

module.exports = router;
