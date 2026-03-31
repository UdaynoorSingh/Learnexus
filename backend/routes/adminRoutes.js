const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const {
  getPendingNotes, verifyNote, deleteNote,
  createSubject, createTopic, getAllNotes, getStats
} = require('../controllers/adminController');

// All admin routes require auth + admin/superadmin role
router.use(auth);
router.use(rbac('admin', 'superadmin'));

router.get('/stats', getStats);
router.get('/notes', getAllNotes);
router.get('/notes/pending', getPendingNotes);
router.put('/notes/:noteId/verify', verifyNote);
router.delete('/notes/:noteId', deleteNote);
router.post('/subjects', createSubject);
router.post('/topics', createTopic);

module.exports = router;
