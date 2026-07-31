const {
  Post,
  Comment,
  User,
  Transaction,
  Tag,
  PostUpvote,
  PostBookmark,
  CommentUpvote
} = require('../models');
const { leanDoc } = require('../utils/mongoHelpers');
const {
  fetchPostEnriched,
  gatherForumTagSet,
  upsertTagPostCount,
  decrementTagPostCount
} = require('../utils/communityHelpers');
const { GHOST_AI_EMAIL } = require('../config/ghostStudent');
const generateAudioSummary = require('../utils/generateAudioSummary');

const AI_BACKEND_URL = process.env.AI_BACKEND_URL || 'http://localhost:5001';
const ANONYMOUS_POST_FEE = 2;
const ANONYMOUS_COMMENT_FEE = 2;
const TOXIC_PENALTY_CREDITS = 10;

async function callModerateService(text) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(`${AI_BACKEND_URL}/api/ai/moderate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal
    });
    const raw = await res.text();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const err = new Error('Moderation service returned invalid JSON.');
      err.httpStatus = 503;
      throw err;
    }
    if (!res.ok) {
      const detail = parsed.detail;
      let msg = 'Moderation service error.';
      if (typeof detail === 'string') msg = detail;
      else if (Array.isArray(detail)) {
        msg = detail.map((d) => (typeof d === 'object' && d?.msg ? d.msg : String(d))).join('; ');
      }
      const err = new Error(msg);
      err.httpStatus = 503;
      throw err;
    }
    return { isToxic: !!parsed.isToxic, reason: String(parsed.reason || '').trim() };
  } catch (e) {
    if (e.httpStatus) throw e;
    if (e.name === 'AbortError') {
      const err = new Error('Moderation request timed out.');
      err.httpStatus = 503;
      throw err;
    }
    const err = new Error(e.message || 'Moderation unavailable.');
    err.httpStatus = 503;
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function applyToxicityPenalty(userId) {
  const user = await User.findOne({ id: userId });
  if (!user) return;
  user.credits = Math.max(0, (user.credits || 0) - TOXIC_PENALTY_CREDITS);
  await user.save();
  await Transaction.create({
    user_id: userId,
    credits_used: TOXIC_PENALTY_CREDITS,
    reason: 'Nexus toxicity penalty'
  });
}

function normalizeForumTag(raw) {
  let s = String(raw || '')
    .trim()
    .split(/\r?\n/)[0]
    .slice(0, 100);
  if (!s) return '#General';
  if (!s.startsWith('#')) s = `#${s}`;
  s = s.replace(/\s+/g, '_').replace(/[^#a-zA-Z0-9_]/g, '');
  if (s === '#' || s.length < 2) return '#General';
  return s.slice(0, 100);
}

async function callAssignTagService(content, existingTags) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(`${AI_BACKEND_URL}/api/ai/community/assign-tag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, existingTags }),
      signal: controller.signal
    });
    const raw = await res.text();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const err = new Error('Tag service returned invalid JSON.');
      err.httpStatus = 503;
      throw err;
    }
    if (!res.ok) {
      const detail = parsed.detail;
      let msg = 'Tag assignment error.';
      if (typeof detail === 'string') msg = detail;
      const err = new Error(msg);
      err.httpStatus = 503;
      throw err;
    }
    const tagVal = parsed.tag != null ? String(parsed.tag) : String(parsed.normalizedTag || '');
    if (!tagVal.trim()) {
      const err = new Error('Tag assignment returned an empty tag.');
      err.httpStatus = 503;
      throw err;
    }
    return tagVal.trim();
  } catch (e) {
    if (e.httpStatus) throw e;
    if (e.name === 'AbortError') {
      const err = new Error('Tag assignment timed out.');
      err.httpStatus = 503;
      throw err;
    }
    const err = new Error(e.message || 'Tag assignment unavailable.');
    err.httpStatus = 503;
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function resolveTagBucketCollegeId(req) {
  const bucket = (req.query.bucket || 'college').toString().toLowerCase();
  if (bucket === 'global') return null;
  const raw = req.query.collegeId;
  if (raw != null && raw !== '') {
    const n = parseInt(String(raw), 10);
    if (!Number.isNaN(n)) return n;
  }
  return req.user.college_id;
}

function parsePostScope(req) {
  const scope = (req.query.scope || 'college').toString().toLowerCase();
  if (scope === 'global') return { kind: 'global' };
  if (scope === 'college') return { kind: 'college', collegeId: req.user.college_id };
  const n = parseInt(scope, 10);
  if (!Number.isNaN(n)) return { kind: 'explore', collegeId: n };
  return { kind: 'college', collegeId: req.user.college_id };
}

function isAdminRole(user) {
  return user && (user.role === 'admin' || user.role === 'superadmin');
}

async function enrichPostsList(posts, viewerUserId) {
  return Promise.all(posts.map((p) => fetchPostEnriched(p.id, viewerUserId)));
}

exports.uploadPostImage = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided.' });
  }
  res.json({ imageUrl: req.file.path });
};

exports.getForumTags = async (req, res) => {
  try {
    const tagBucket = resolveTagBucketCollegeId(req);
    const tagSet = await gatherForumTagSet(req.user.college_id, tagBucket);
    res.json({ tags: Array.from(tagSet).sort((a, b) => a.localeCompare(b)) });
  } catch (error) {
    console.error('getForumTags error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getTrendingRooms = async (req, res) => {
  try {
    const tagBucket = resolveTagBucketCollegeId(req);
    const filter =
      tagBucket == null
        ? { college_id: null, post_count: { $gte: 3 } }
        : { college_id: tagBucket, post_count: { $gte: 3 } };
    const tags = await Tag.find(filter).sort({ last_active: -1 }).limit(15).select('name post_count');
    res.json(tags.map((t) => ({ name: t.name, post_count: t.post_count })));
  } catch (error) {
    console.error('getTrendingRooms error:', error);
    res.json([]);
  }
};

exports.getPosts = async (req, res) => {
  try {
    const rawTag = req.query.tag;
    const tagFilter =
      rawTag && rawTag !== 'All' && rawTag !== '#All' ? String(rawTag).trim() : null;
    const scope = parsePostScope(req);

    const filter = {};
    if (scope.kind === 'global') {
      filter.college_id = null;
    } else {
      filter.college_id = scope.collegeId;
    }
    if (tagFilter) filter.tag = tagFilter;

    const posts = await Post.find(filter).sort({ created_at: -1 });
    res.json(await enrichPostsList(posts, req.user.id));
  } catch (error) {
    console.error('getPosts error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getBookmarkedPosts = async (req, res) => {
  try {
    const userId = req.user.id;
    const bookmarks = await PostBookmark.find({ user_id: userId });
    const postIds = bookmarks.map((b) => b.post_id);
    const posts = await Post.find({ id: { $in: postIds } }).sort({ created_at: -1 });
    const enriched = await enrichPostsList(posts, userId);
    res.json(enriched.map((p) => ({ ...p, user_has_bookmarked: true })));
  } catch (error) {
    console.error('getBookmarkedPosts error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.adminDeletePost = async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  if (Number.isNaN(postId)) {
    return res.status(400).json({ error: 'Invalid post id.' });
  }
  if (!isAdminRole(req.user)) {
    return res.status(403).json({ error: 'Only administrators can delete posts.' });
  }

  try {
    const post = await Post.findOne({ id: postId });
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const { tag, college_id: postCollegeId } = post;
    await CommentUpvote.deleteMany({ comment_id: { $in: (await Comment.find({ post_id: postId })).map((c) => c.id) } });
    await Comment.deleteMany({ post_id: postId });
    await PostUpvote.deleteMany({ post_id: postId });
    await PostBookmark.deleteMany({ post_id: postId });
    await Post.deleteOne({ id: postId });
    await decrementTagPostCount(tag, postCollegeId);
    res.json({ ok: true, id: postId });
  } catch (error) {
    console.error('adminDeletePost error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.createPost = async (req, res) => {
  const { title, content, image_url: imageUrl } = req.body;
  const isAnonymous = req.body.is_anonymous === true;
  let bounty = parseInt(req.body.bounty, 10);
  if (Number.isNaN(bounty) || bounty < 0) bounty = 0;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Title is required.' });
  }
  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Content is required.' });
  }

  const trimmedTitle = title.trim().slice(0, 500);
  const trimmedContent = content.trim();
  const img = imageUrl && typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null;
  const userId = req.user.id;

  let moderation;
  try {
    moderation = await callModerateService(`${trimmedTitle}\n\n${trimmedContent}`);
  } catch (e) {
    return res.status(e.httpStatus || 503).json({ error: e.message || 'Moderation unavailable.' });
  }

  if (moderation.isToxic) {
    try {
      await applyToxicityPenalty(userId);
    } catch (penErr) {
      console.error('createPost toxicity penalty:', penErr);
      return res.status(500).json({ error: 'Server error.' });
    }
    return res.status(400).json({
      error: moderation.reason || 'This content violates community guidelines.',
      toxic: true
    });
  }

  let postCollegeId = null;
  if (req.body.college_id != null && req.body.college_id !== '') {
    const n = parseInt(req.body.college_id, 10);
    if (!Number.isNaN(n)) {
      if (n !== req.user.college_id) {
        return res.status(403).json({ error: "Read-Only: You cannot post in another college's forum." });
      }
      postCollegeId = n;
    }
  }

  let trimmedTag;
  try {
    const existingTags = Array.from(await gatherForumTagSet(req.user.college_id, postCollegeId)).sort((a, b) =>
      a.localeCompare(b)
    );
    const rawTag = await callAssignTagService(`${trimmedTitle}\n\n${trimmedContent}`, existingTags);
    trimmedTag = normalizeForumTag(rawTag);
  } catch (e) {
    return res.status(e.httpStatus || 503).json({ error: e.message || 'Tag assignment unavailable.' });
  }

  const anonFee = isAnonymous ? ANONYMOUS_POST_FEE : 0;
  const totalCharge = bounty + anonFee;

  try {
    if (totalCharge > 0) {
      const user = await User.findOne({ id: userId });
      if (!user) return res.status(404).json({ error: 'User not found.' });
      if ((user.credits || 0) < totalCharge) {
        const parts = [];
        if (bounty > 0) parts.push('bounty');
        if (anonFee > 0) parts.push('anonymous posting fee');
        return res.status(400).json({ error: `Insufficient credits for this post (${parts.join(' and ')}).` });
      }
      user.credits -= totalCharge;
      await user.save();
      if (bounty > 0) {
        await Transaction.create({ user_id: userId, credits_used: bounty, reason: 'Nexus Board post bounty' });
      }
      if (anonFee > 0) {
        await Transaction.create({ user_id: userId, credits_used: anonFee, reason: 'Nexus anonymous post' });
      }
    }

    const post = await Post.create({
      user_id: userId,
      college_id: postCollegeId,
      title: trimmedTitle,
      content: trimmedContent,
      image_url: img,
      tag: trimmedTag,
      bounty,
      is_anonymous: isAnonymous
    });

    await upsertTagPostCount(trimmedTag, postCollegeId);

    generateAudioSummary(`${trimmedTitle}\n\n${trimmedContent}`)
      .then((audioUrl) => {
        if (audioUrl) {
          Post.updateOne({ id: post.id }, { audio_url: audioUrl }).catch((err) =>
            console.error('[AudioSummary] DB update failed:', err)
          );
        }
      })
      .catch((err) => console.error('[AudioSummary] Pipeline error:', err));

    const enriched = await fetchPostEnriched(post.id, userId);
    res.status(201).json(enriched);
  } catch (error) {
    console.error('createPost error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

function parseParentCommentId(body) {
  const raw = body.parent_comment_id ?? body.parentCommentId;
  if (raw === undefined || raw === null || raw === '') return null;
  const n = parseInt(String(raw), 10);
  if (Number.isNaN(n) || n <= 0) return NaN;
  return n;
}

async function selectCommentRow(commentId) {
  const c = await Comment.findOne({ id: commentId });
  if (!c) return null;
  const u = await User.findOne({ id: c.user_id });
  return {
    ...leanDoc(c),
    author_name: c.is_anonymous ? 'Anonymous Learner' : (u?.name || 'Unknown'),
    is_ai_tutor: u?.email === GHOST_AI_EMAIL
  };
}

exports.addComment = async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const { content } = req.body;
  const isAnonymous = req.body.is_anonymous === true;
  const userId = req.user.id;
  const parentParsed = parseParentCommentId(req.body);
  let parentCommentId = null;
  if (Number.isNaN(parentParsed)) {
    return res.status(400).json({ error: 'Invalid parent_comment_id.' });
  }
  if (parentParsed !== null) parentCommentId = parentParsed;

  if (Number.isNaN(postId)) return res.status(400).json({ error: 'Invalid post id.' });
  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Content is required.' });
  }

  const trimmedBody = content.trim();

  let moderation;
  try {
    moderation = await callModerateService(trimmedBody);
  } catch (e) {
    return res.status(e.httpStatus || 503).json({ error: e.message || 'Moderation unavailable.' });
  }

  if (moderation.isToxic) {
    try {
      await applyToxicityPenalty(userId);
    } catch (penErr) {
      console.error('addComment toxicity penalty:', penErr);
      return res.status(500).json({ error: 'Server error.' });
    }
    return res.status(400).json({
      error: moderation.reason || 'This content violates community guidelines.',
      toxic: true
    });
  }

  const anonFee = isAnonymous ? ANONYMOUS_COMMENT_FEE : 0;

  try {
    const postRow = await Post.findOne({ id: postId });
    if (!postRow) return res.status(404).json({ error: 'Post not found.' });

    const isGhostUser = req.user.email === GHOST_AI_EMAIL;
    if (postRow.college_id != null && postRow.college_id !== req.user.college_id && !isGhostUser) {
      return res.status(403).json({ error: "Read-Only: You cannot post in another college's forum." });
    }

    if (parentCommentId != null) {
      const parent = await Comment.findOne({ id: parentCommentId });
      if (!parent) return res.status(400).json({ error: 'Parent comment not found.' });
      if (parent.post_id !== postId) {
        return res.status(400).json({ error: 'Parent comment does not belong to this post.' });
      }
    }

    if (anonFee > 0) {
      const user = await User.findOne({ id: userId });
      if (!user) return res.status(404).json({ error: 'User not found.' });
      if ((user.credits || 0) < anonFee) {
        return res.status(400).json({ error: 'Insufficient credits for anonymous comment.' });
      }
      user.credits -= anonFee;
      await user.save();
      await Transaction.create({ user_id: userId, credits_used: anonFee, reason: 'Nexus anonymous comment' });
    }

    const comment = await Comment.create({
      post_id: postId,
      user_id: userId,
      content: trimmedBody,
      is_anonymous: anonFee > 0 ? true : false,
      parent_comment_id: parentCommentId
    });

    res.status(201).json(await selectCommentRow(comment.id));
  } catch (error) {
    console.error('addComment error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getComments = async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  if (Number.isNaN(postId)) return res.status(400).json({ error: 'Invalid post id.' });

  try {
    const postCheck = await Post.findOne({ id: postId });
    if (!postCheck) return res.status(404).json({ error: 'Post not found.' });

    const viewerId = req.user.id;
    const comments = await Comment.find({ post_id: postId }).sort({ created_at: 1 });
    const rows = await Promise.all(
      comments.map(async (c) => {
        const u = await User.findOne({ id: c.user_id });
        const likeCount = await CommentUpvote.countDocuments({ comment_id: c.id });
        const userLiked = await CommentUpvote.exists({ comment_id: c.id, user_id: viewerId });
        return {
          ...leanDoc(c),
          author_name: c.is_anonymous ? 'Anonymous Learner' : (u?.name || 'Unknown'),
          is_ai_tutor: u?.email === GHOST_AI_EMAIL,
          like_count: likeCount,
          user_has_liked: !!userLiked
        };
      })
    );
    res.json(rows);
  } catch (error) {
    console.error('getComments error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.toggleCommentUpvote = async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const commentId = parseInt(req.params.commentId, 10);
  const userId = req.user.id;

  if (Number.isNaN(postId) || Number.isNaN(commentId)) {
    return res.status(400).json({ error: 'Invalid post or comment id.' });
  }

  try {
    const c = await Comment.findOne({ id: commentId, post_id: postId });
    if (!c) return res.status(404).json({ error: 'Comment not found.' });

    const existing = await CommentUpvote.findOne({ user_id: userId, comment_id: commentId });
    let liked = false;
    if (existing) {
      await CommentUpvote.deleteOne({ user_id: userId, comment_id: commentId });
    } else {
      await CommentUpvote.create({ user_id: userId, comment_id: commentId });
      liked = true;
    }

    const likeCount = await CommentUpvote.countDocuments({ comment_id: commentId });
    res.json({ liked, likeCount });
  } catch (error) {
    console.error('toggleCommentUpvote error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.toggleBookmark = async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  if (Number.isNaN(postId)) return res.status(400).json({ error: 'Invalid post id.' });

  const userId = req.user.id;

  try {
    const postCheck = await Post.findOne({ id: postId });
    if (!postCheck) return res.status(404).json({ error: 'Post not found.' });

    const existing = await PostBookmark.findOne({ user_id: userId, post_id: postId });
    let bookmarked = false;
    if (existing) {
      await PostBookmark.deleteOne({ user_id: userId, post_id: postId });
    } else {
      await PostBookmark.create({ user_id: userId, post_id: postId });
      bookmarked = true;
    }

    const bookmarkCount = await PostBookmark.countDocuments({ post_id: postId });
    res.json({ bookmarked, bookmarkCount });
  } catch (error) {
    console.error('toggleBookmark error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.toggleUpvote = async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  if (Number.isNaN(postId)) return res.status(400).json({ error: 'Invalid post id.' });

  const userId = req.user.id;

  try {
    const postCheck = await Post.findOne({ id: postId });
    if (!postCheck) return res.status(404).json({ error: 'Post not found.' });

    const existing = await PostUpvote.findOne({ user_id: userId, post_id: postId });
    let upvoted = false;
    if (existing) {
      await PostUpvote.deleteOne({ user_id: userId, post_id: postId });
    } else {
      await PostUpvote.create({ user_id: userId, post_id: postId });
      upvoted = true;
    }

    const upvoteCount = await PostUpvote.countDocuments({ post_id: postId });
    res.json({ upvoted, upvoteCount });
  } catch (error) {
    console.error('toggleUpvote error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.resolvePost = async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const commentId = parseInt(req.body.commentId, 10);

  if (Number.isNaN(postId)) return res.status(400).json({ error: 'Invalid post id.' });
  if (Number.isNaN(commentId)) return res.status(400).json({ error: 'commentId is required.' });

  const ownerId = req.user.id;

  try {
    const post = await Post.findOne({ id: postId });
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    if (post.user_id !== ownerId) {
      return res.status(403).json({ error: 'Only the post owner can resolve the bounty.' });
    }
    if (post.is_solved) {
      return res.status(409).json({ error: 'This post is already resolved.' });
    }

    const comment = await Comment.findOne({ id: commentId });
    if (!comment) return res.status(404).json({ error: 'Comment not found.' });
    if (comment.post_id !== postId) {
      return res.status(400).json({ error: 'Comment does not belong to this post.' });
    }
    if (comment.parent_comment_id != null) {
      return res.status(400).json({
        error: 'Only a top-level comment can be marked as the accepted answer for a bounty.'
      });
    }

    post.is_solved = true;
    await post.save();
    await Comment.updateMany({ post_id: postId }, { is_accepted_answer: false });
    await Comment.updateOne({ id: commentId }, { is_accepted_answer: true });

    const bounty = post.bounty || 0;
    if (bounty > 0) {
      await User.findOneAndUpdate({ id: comment.user_id }, { $inc: { credits: bounty } });
      await Transaction.create({
        user_id: comment.user_id,
        credits_added: bounty,
        reason: 'Nexus Board bounty awarded'
      });
    }

    const enriched = await fetchPostEnriched(postId, ownerId);
    const roomTag = (post.tag || '').trim() || '#General';
    void fetch(`${AI_BACKEND_URL}/api/ai/community/ingest-solution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tag: roomTag,
        question: `${post.title || ''}\n\n${post.content || ''}`.trim(),
        answer: String(comment.content || '').trim()
      })
    }).catch((err) => console.error('ingest-solution (Room Mascot):', err));

    res.json({ post: enriched, acceptedCommentId: commentId });
  } catch (error) {
    console.error('resolvePost error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.mascotChat = async (req, res) => {
  const tag = typeof req.body?.tag === 'string' ? req.body.tag.trim() : '';
  const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
  if (!tag || tag === '#All') {
    return res.status(400).json({ error: 'A specific room tag is required.' });
  }
  if (!query) return res.status(400).json({ error: 'query is required.' });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const r = await fetch(`${AI_BACKEND_URL}/api/ai/community/mascot-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag, query }),
      signal: controller.signal
    });
    const raw = await r.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(502).json({ error: 'AI service returned invalid JSON.' });
    }
    if (!r.ok) {
      const rawErr = data.detail ?? data.error ?? 'Mascot chat failed.';
      const msg =
        typeof rawErr === 'string'
          ? rawErr
          : Array.isArray(rawErr)
            ? rawErr.map((x) => x?.msg || x?.message || JSON.stringify(x)).join('; ')
            : 'Mascot chat failed.';
      return res.status(r.status >= 400 && r.status < 600 ? r.status : 502).json({ error: msg });
    }
    return res.json({ reply: data.reply, indexed: data.indexed });
  } catch (e) {
    console.error('mascotChat error:', e);
    return res.status(502).json({ error: 'AI service unavailable.' });
  } finally {
    clearTimeout(timer);
  }
};
