const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireVerified = require('../middleware/verified');
const postImageUpload = require('../middleware/postImageUpload');
const {
  uploadPostImage,
  getForumTags,
  getTrendingRooms,
  getPosts,
  getBookmarkedPosts,
  createPost,
  addComment,
  getComments,
  toggleBookmark,
  toggleUpvote,
  resolvePost,
  mascotChat,
  toggleCommentUpvote,
  adminDeletePost
} = require('../controllers/communityController');

const handlePostImageUpload = (req, res, next) => {
  postImageUpload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Image upload failed.' });
    }
    next();
  });
};

router.use(auth);
router.use(requireVerified);

router.post('/upload-image', handlePostImageUpload, uploadPostImage);
router.get('/tags', getForumTags);
router.get('/rooms', getTrendingRooms);
router.get('/posts/bookmarks', getBookmarkedPosts);
router.get('/posts', getPosts);
router.post('/posts', createPost);
router.delete('/posts/:id', adminDeletePost);
router.get('/posts/:id/comments', getComments);
router.post('/posts/:id/comments/:commentId/upvote', toggleCommentUpvote);
router.post('/posts/:id/comments', addComment);
router.post('/posts/:id/bookmark', toggleBookmark);
router.post('/posts/:id/upvote', toggleUpvote);
router.post('/posts/:id/resolve', resolvePost);
router.post('/mascot-chat', mascotChat);

module.exports = router;
