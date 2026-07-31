const { LibraryPost, LibraryPostVote, User } = require('../models');
const { leanDoc } = require('../utils/mongoHelpers');
const { generateAudioDirect } = require('../utils/generateAudioSummary');

async function enrichLibraryPost(lp, viewerId) {
  const author = await User.findOne({ id: lp.user_id });
  const [likeCount, dislikeCount, userVote] = await Promise.all([
    LibraryPostVote.countDocuments({ post_id: lp.id, vote_type: 'like' }),
    LibraryPostVote.countDocuments({ post_id: lp.id, vote_type: 'dislike' }),
    LibraryPostVote.findOne({ post_id: lp.id, user_id: viewerId })
  ]);
  return {
    ...leanDoc(lp),
    author_name: author?.name || null,
    like_count: likeCount,
    dislike_count: dislikeCount,
    user_vote: userVote?.vote_type || null
  };
}

exports.getLibraryPosts = async (req, res) => {
  try {
    const scope = (req.query.scope || 'college').toLowerCase();
    const viewerId = req.user.id;

    const filter = scope === 'global' ? { college_id: null } : { college_id: req.user.college_id };
    const posts = await LibraryPost.find(filter).sort({ created_at: -1 });
    const rows = await Promise.all(posts.map((lp) => enrichLibraryPost(lp, viewerId)));
    res.json(rows);
  } catch (error) {
    console.error('getLibraryPosts error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getLibraryPost = async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (Number.isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid post id.' });
    }

    const lp = await LibraryPost.findOne({ id: postId });
    if (!lp) return res.status(404).json({ error: 'Library post not found.' });

    res.json(await enrichLibraryPost(lp, req.user.id));
  } catch (error) {
    console.error('getLibraryPost error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.createLibraryPost = async (req, res) => {
  try {
    const { topic, description, content, difficulty } = req.body;
    const userId = req.user.id;

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ error: 'Topic is required.' });
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'Description is required.' });
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Content is required.' });
    }

    const validDifficulties = ['beginner', 'intermediate', 'advanced'];
    const trimmedDifficulty = (difficulty || 'intermediate').toLowerCase().trim();
    if (!validDifficulties.includes(trimmedDifficulty)) {
      return res.status(400).json({ error: 'Difficulty must be beginner, intermediate, or advanced.' });
    }

    let postCollegeId = req.user.college_id;
    if (req.body.scope === 'global') postCollegeId = null;

    const newPost = await LibraryPost.create({
      user_id: userId,
      college_id: postCollegeId,
      topic: topic.trim().slice(0, 255),
      description: description.trim(),
      content: content.trim(),
      difficulty: trimmedDifficulty
    });

    generateAudioDirect(description.trim())
      .then((audioUrl) => {
        if (audioUrl) {
          LibraryPost.updateOne({ id: newPost.id }, { audio_url: audioUrl })
            .then(() => console.log(`[NexusLibrary] Audio ready for post #${newPost.id}`))
            .catch((err) => console.error('[NexusLibrary] DB update failed:', err));
        }
      })
      .catch((err) => console.error('[NexusLibrary] Audio pipeline error:', err));

    res.status(201).json(await enrichLibraryPost(newPost, userId));
  } catch (error) {
    console.error('createLibraryPost error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.voteLibraryPost = async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  if (Number.isNaN(postId)) {
    return res.status(400).json({ error: 'Invalid post id.' });
  }

  const voteType = req.body.type;
  if (!voteType || !['like', 'dislike'].includes(voteType)) {
    return res.status(400).json({ error: 'Vote type must be "like" or "dislike".' });
  }

  const userId = req.user.id;

  try {
    const post = await LibraryPost.findOne({ id: postId });
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const existing = await LibraryPostVote.findOne({ user_id: userId, post_id: postId });
    let userVote = null;

    if (existing) {
      if (existing.vote_type === voteType) {
        await LibraryPostVote.deleteOne({ user_id: userId, post_id: postId });
      } else {
        existing.vote_type = voteType;
        await existing.save();
        userVote = voteType;
      }
    } else {
      await LibraryPostVote.create({ user_id: userId, post_id: postId, vote_type: voteType });
      userVote = voteType;
    }

    const [likeCount, dislikeCount] = await Promise.all([
      LibraryPostVote.countDocuments({ post_id: postId, vote_type: 'like' }),
      LibraryPostVote.countDocuments({ post_id: postId, vote_type: 'dislike' })
    ]);

    res.json({ like_count: likeCount, dislike_count: dislikeCount, user_vote: userVote });
  } catch (error) {
    console.error('voteLibraryPost error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.deleteLibraryPost = async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  if (Number.isNaN(postId)) {
    return res.status(400).json({ error: 'Invalid post id.' });
  }

  const userId = req.user.id;

  try {
    const post = await LibraryPost.findOne({ id: postId });
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    if (post.user_id !== userId) {
      return res.status(403).json({ error: 'Only the post owner can delete this post.' });
    }

    await LibraryPostVote.deleteMany({ post_id: postId });
    await LibraryPost.deleteOne({ id: postId });
    res.json({ ok: true, id: postId });
  } catch (error) {
    console.error('deleteLibraryPost error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};
