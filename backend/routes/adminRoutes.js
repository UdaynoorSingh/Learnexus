const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const {
  getPendingNotes, verifyNote, deleteNote,
  createDegree, createBranch, createSemester,
  createSubject, createTopic, getAllNotes, getStats, getChartStats
} = require('../controllers/adminController');


router.use(auth);
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

module.exports = router;
