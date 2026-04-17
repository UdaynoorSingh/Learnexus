const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireVerified = require('../middleware/verified');
const {
  getOverview,
  getConceptGraph,
  getTutorState,
  putTutorState,
  listPins,
  createPin,
  updatePin,
  deletePin,
  listEvents,
  createEvent
} = require('../controllers/dashboardController');

router.use(auth);
router.use(requireVerified);

router.get('/overview', getOverview);
router.get('/concept-graph', getConceptGraph);
router.get('/tutor-state', getTutorState);
router.put('/tutor-state', putTutorState);

router.get('/pins', listPins);
router.post('/pins', createPin);
router.put('/pins/:id', updatePin);
router.delete('/pins/:id', deletePin);

router.get('/events', listEvents);
router.post('/events', createEvent);

module.exports = router;

