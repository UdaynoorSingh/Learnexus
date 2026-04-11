const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireVerified = require('../middleware/verified');
const {
  getLibraryPosts,
  getLibraryPost,
  createLibraryPost,
  voteLibraryPost,
  deleteLibraryPost
} = require('../controllers/libraryController');

router.use(auth);
router.use(requireVerified);

router.get('/posts', getLibraryPosts);
router.get('/posts/:id', getLibraryPost);
router.post('/posts', createLibraryPost);
router.post('/posts/:id/vote', voteLibraryPost);
router.delete('/posts/:id', deleteLibraryPost);

module.exports = router;
