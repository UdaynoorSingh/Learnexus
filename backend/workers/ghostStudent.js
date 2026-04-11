const pool = require('../config/db');
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

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [GHOST_AI_EMAIL]);
  if (existing.rows.length) {
    aiUserIdCache = existing.rows[0].id;
    return aiUserIdCache;
  }

  const ins = await pool.query(
    `INSERT INTO users (name, email, college_id, role, credits, is_verified)
     VALUES (
       'AI Tutor',
       $1,
       (SELECT id FROM colleges WHERE LOWER(domain_suffix) = 'system.learnexus.internal' LIMIT 1),
       'student',
       0,
       true
     )
     RETURNING id`,
    [GHOST_AI_EMAIL]
  );
  aiUserIdCache = ins.rows[0].id;
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

  const r = await pool.query(
    `SELECT id FROM topics
     WHERE college_id = $2
       AND LOWER(REPLACE(REPLACE(TRIM(name), ' ', '_'), '-', '_')) = $1
     LIMIT 1`,
    [normalized, authorCollegeId]
  );
  return r.rows[0]?.id ?? null;
}

async function fetchAiAnswer({ title, content, topicId, imageUrl }) {
  const body = {
    title,
    content,
    topicId: topicId ?? undefined,
    imageUrl: imageUrl || undefined
  };

  const res = await fetch(`${AI_URL}/api/ai/community/auto-answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
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

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const gate = await client.query(
      `SELECT p.id FROM posts p
       WHERE p.id = $1
         AND p.is_solved = false
         AND p.created_at < NOW() - INTERVAL '10 minutes'
         AND NOT EXISTS (SELECT 1 FROM comments c WHERE c.post_id = p.id)
       FOR UPDATE`,
      [post.id]
    );
    if (gate.rows.length === 0) {
      await client.query('ROLLBACK');
      return;
    }

    await client.query(
      `INSERT INTO comments (post_id, user_id, content, is_anonymous, parent_comment_id)
       VALUES ($1, $2, $3, false, NULL)`,
      [post.id, aiUserId, answer]
    );
    await client.query('COMMIT');
    console.log(`[GhostStudent] Posted AI Tutor comment on post ${post.id}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[GhostStudent] DB error for post ${post.id}:`, err.message || err);
  } finally {
    client.release();
  }
}

async function runGhostStudentCycle() {
  try {
    const aiUserId = await ensureGhostAiUserId();

    const { rows } = await pool.query(
      `SELECT p.id, p.title, p.content, p.tag, p.image_url, u.college_id AS author_college_id
       FROM posts p
       INNER JOIN users u ON u.id = p.user_id
       WHERE p.is_solved = false
         AND p.created_at < NOW() - INTERVAL '10 minutes'
         AND NOT EXISTS (SELECT 1 FROM comments c WHERE c.post_id = p.id)
       ORDER BY p.created_at ASC
       LIMIT 10`
    );

    for (const post of rows) {
      await processOnePost(post, aiUserId);
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
