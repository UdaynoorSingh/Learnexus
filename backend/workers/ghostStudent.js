const { User, College, Post, Comment, Topic } = require('../models');
const { GHOST_AI_EMAIL } = require('../config/ghostStudent');

const INTERVAL_MS = 5 * 60 * 1000;
const AI_URL = process.env.AI_BACKEND_URL || 'http://localhost:5001';

let aiUserIdCache = null;

async function ensureGhostAiUserId() {
  const envId = process.env.GHOST_STUDENT_USER_ID;
  if (envId) {
    const n = parseInt(envId, 10);
    if (!Number.isNaN(n)) return n;
  }

  if (aiUserIdCache != null) return aiUserIdCache;

  const existing = await User.findOne({ email: GHOST_AI_EMAIL });
  if (existing) {
    aiUserIdCache = existing.id;
    return aiUserIdCache;
  }

  const systemCollege = await College.findOne({ domain_suffix: 'system.learnexus.internal' });
  const ins = await User.create({
    name: 'AI Tutor',
    email: GHOST_AI_EMAIL,
    college_id: systemCollege?.id,
    role: 'student',
    credits: 0,
    is_verified: true
  });
  aiUserIdCache = ins.id;
  console.log(`[GhostStudent] Created AI Tutor user id=${aiUserIdCache}`);
  return aiUserIdCache;
}

async function mapTagToTopicId(tag, authorCollegeId) {
  if (!tag || tag === '#All') return null;
  if (authorCollegeId == null) return null;
  const normalized = String(tag)
    .replace(/^#/, '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  if (!normalized) return null;

  const topics = await Topic.find({ college_id: authorCollegeId });
  const match = topics.find(
    (t) =>
      String(t.name || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/-/g, '_') === normalized
  );
  return match?.id ?? null;
}

async function fetchAiAnswer({ title, content, topicId, imageUrl }) {
  const res = await fetch(`${AI_URL}/api/ai/community/auto-answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, topicId: topicId ?? undefined, imageUrl: imageUrl || undefined })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI HTTP ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = await res.json();
  if (!data.answer || typeof data.answer !== 'string' || !data.answer.trim()) {
    throw new Error('AI returned empty answer');
  }
  return data.answer.trim();
}

async function processOnePost(post, aiUserId) {
  const topicId = await mapTagToTopicId(post.tag, post.author_college_id);
  let answer;
  try {
    answer = await fetchAiAnswer({
      title: post.title,
      content: post.content,
      topicId,
      imageUrl: post.image_url
    });
  } catch (err) {
    console.error(`[GhostStudent] AI failed for post ${post.id}:`, err.message || err);
    return;
  }

  try {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const p = await Post.findOne({
      id: post.id,
      is_solved: false,
      created_at: { $lt: tenMinAgo }
    });
    if (!p) return;

    const commentCount = await Comment.countDocuments({ post_id: post.id });
    if (commentCount > 0) return;

    await Comment.create({
      post_id: post.id,
      user_id: aiUserId,
      content: answer,
      is_anonymous: false,
      parent_comment_id: null
    });
    console.log(`[GhostStudent] Posted AI Tutor comment on post ${post.id}`);
  } catch (err) {
    console.error(`[GhostStudent] DB error for post ${post.id}:`, err.message || err);
  }
}

async function runGhostStudentCycle() {
  try {
    const aiUserId = await ensureGhostAiUserId();
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);

    const posts = await Post.find({ is_solved: false, created_at: { $lt: tenMinAgo } })
      .sort({ created_at: 1 })
      .limit(10);

    for (const post of posts) {
      const commentCount = await Comment.countDocuments({ post_id: post.id });
      if (commentCount > 0) continue;

      const author = await User.findOne({ id: post.user_id });
      await processOnePost(
        {
          id: post.id,
          title: post.title,
          content: post.content,
          tag: post.tag,
          image_url: post.image_url,
          author_college_id: author?.college_id
        },
        aiUserId
      );
    }
  } catch (err) {
    console.error('[GhostStudent] cycle error:', err.message || err);
  }
}

function startGhostStudentWorker() {
  console.log('[GhostStudent] Worker started (every 5 min; posts idle ≥10 min with 0 comments)');
  setInterval(runGhostStudentCycle, INTERVAL_MS);
  setTimeout(runGhostStudentCycle, 15000);
}

module.exports = { startGhostStudentWorker, runGhostStudentCycle, ensureGhostAiUserId };
