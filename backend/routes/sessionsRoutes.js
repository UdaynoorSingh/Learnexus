const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireVerified = require('../middleware/verified');
const {
  listSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession
} = require('../controllers/sessionsController');

router.use(auth);
router.use(requireVerified);

router.get('/', listSessions);
router.get('/:id', getSession);
router.post('/', createSession);
router.put('/:id', updateSession);
router.delete('/:id', deleteSession);

module.exports = router;

