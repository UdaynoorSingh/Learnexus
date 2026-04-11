const pool = require('../config/db');
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
        msg = detail
          .map((d) => (typeof d === 'object' && d?.msg ? d.msg : String(d)))
          .join('; ');
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const u = await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (u.rows.length === 0) {
      await client.query('ROLLBACK');
      return;
    }
    await client.query('UPDATE users SET credits = credits - $1 WHERE id = $2', [
      TOXIC_PENALTY_CREDITS,
      userId
    ]);
    await client.query(
      `INSERT INTO transactions (user_id, credits_used, reason)
       VALUES ($1, $2, $3)`,
      [userId, TOXIC_PENALTY_CREDITS, 'Nexus toxicity penalty']
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

function nameToForumTag(raw) {
  const s = String(raw || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '');
  if (s.length < 2) return null;
  return `#${s}`;
}

async function gatherForumTagSet(academicCollegeId, tagTableCollegeId) {
  const tagSet = new Set([
    '#Career',
    '#Career_Advice',
    '#General_Doubts',
    '#Homework',
    '#General'
  ]);

  const [topics, subjects, degrees, branches, semesters] = await Promise.all([
    pool.query(
      `SELECT DISTINCT name FROM topics WHERE college_id = $1 AND name IS NOT NULL AND trim(name) <> ''`,
      [academicCollegeId]
    ),
    pool.query(
      `SELECT DISTINCT name FROM subjects WHERE college_id = $1 AND name IS NOT NULL AND trim(name) <> ''`,
      [academicCollegeId]
    ),
    pool.query(
      `SELECT DISTINCT name FROM degrees WHERE college_id = $1 AND name IS NOT NULL AND trim(name) <> ''`,
      [academicCollegeId]
    ),
    pool.query(
      `SELECT DISTINCT name FROM branches WHERE college_id = $1 AND name IS NOT NULL AND trim(name) <> ''`,
      [academicCollegeId]
    ),
    pool.query(
      `SELECT DISTINCT number FROM semesters WHERE college_id = $1 ORDER BY number`,
      [academicCollegeId]
    )
  ]);

  let tagRows = { rows: [] };
  try {
    tagRows = await pool.query(
      `SELECT name FROM tags WHERE name IS NOT NULL AND trim(name) <> ''
       AND college_id IS NOT DISTINCT FROM $1`,
      [tagTableCollegeId]
    );
  } catch {
  }

  topics.rows.forEach((r) => {
    const t = nameToForumTag(r.name);
    if (t) tagSet.add(t);
  });
  subjects.rows.forEach((r) => {
    const t = nameToForumTag(r.name);
    if (t) tagSet.add(t);
  });
  degrees.rows.forEach((r) => {
    const t = nameToForumTag(r.name);
    if (t) tagSet.add(t);
  });
  branches.rows.forEach((r) => {
    const t = nameToForumTag(r.name);
    if (t) tagSet.add(t);
  });
  semesters.rows.forEach((r) => {
    tagSet.add(`#Semester_${r.number}`);
  });
  tagRows.rows.forEach((r) => {
    const n = String(r.name || '').trim();
    if (n) tagSet.add(n.startsWith('#') ? n : `#${n}`);
  });

  return tagSet;
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

async function upsertTagPostCount(executor, tagName, tagCollegeId) {
  const up = await executor.query(
    `UPDATE tags SET post_count = post_count + 1, last_active = NOW()
     WHERE name = $1 AND college_id IS NOT DISTINCT FROM $2`,
    [tagName, tagCollegeId]
  );
  if (up.rowCount === 0) {
    await executor.query(
      `INSERT INTO tags (name, college_id, post_count, last_active) VALUES ($1, $2, 1, NOW())`,
      [tagName, tagCollegeId]
    );
  }
}

async function decrementTagPostCount(executor, tagName, tagCollegeId) {
  if (!tagName || typeof tagName !== 'string') return;
  try {
    await executor.query(
      `UPDATE tags SET post_count = GREATEST(0, post_count - 1)
       WHERE name = $1 AND college_id IS NOT DISTINCT FROM $2`,
      [tagName, tagCollegeId]
    );
  } catch (e) {
  }
}

/** Tags table bucket: NULL = global Nexus rooms. */
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

async function fetchPostEnriched(postId, viewerUserId) {
  const result = await pool.query(
    `SELECT p.*,
        CASE WHEN p.is_anonymous THEN 'Anonymous Learner' ELSE u.name END AS author_name,
        (SELECT COUNT(*)::int FROM post_upvotes pu WHERE pu.post_id = p.id) AS upvote_count,
        (SELECT COUNT(*)::int FROM comments c WHERE c.post_id = p.id) AS comment_count,
        EXISTS (SELECT 1 FROM post_upvotes pu2 WHERE pu2.post_id = p.id AND pu2.user_id = $2) AS user_has_upvoted,
        EXISTS (SELECT 1 FROM post_bookmarks bm WHERE bm.post_id = p.id AND bm.user_id = $2) AS user_has_bookmarked,
        (SELECT COUNT(*)::int FROM post_bookmarks bm2 WHERE bm2.post_id = p.id) AS bookmark_count
       FROM posts p INNER JOIN users u ON u.id = p.user_id WHERE p.id = $1`,
    [postId, viewerUserId]
  );
  return result.rows[0];
}

exports.uploadPostImage = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided.' });
  }
  const imageUrl = req.file.path;
  res.json({ imageUrl });
};

exports.getForumTags = async (req, res) => {
  try {
    const tagBucket = resolveTagBucketCollegeId(req);
    const tagSet = await gatherForumTagSet(req.user.college_id, tagBucket);
    const tags = Array.from(tagSet).sort((a, b) => a.localeCompare(b));
    res.json({ tags });
  } catch (error) {
    console.error('getForumTags error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getTrendingRooms = async (req, res) => {
  try {
    const tagBucket = resolveTagBucketCollegeId(req);
    const result =
      tagBucket == null
        ? await pool.query(
            `SELECT name, post_count FROM tags
             WHERE college_id IS NULL AND post_count >= 3
             ORDER BY last_active DESC NULLS LAST
             LIMIT 15`
          )
        : await pool.query(
            `SELECT name, post_count FROM tags
             WHERE college_id = $1 AND post_count >= 3
             ORDER BY last_active DESC NULLS LAST
             LIMIT 15`,
            [tagBucket]
          );
    res.json(result.rows);
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

    let query = `
      SELECT
        p.*,
        CASE WHEN p.is_anonymous THEN 'Anonymous Learner' ELSE u.name END AS author_name,
        (SELECT COUNT(*)::int FROM post_upvotes pu WHERE pu.post_id = p.id) AS upvote_count,
        (SELECT COUNT(*)::int FROM comments c WHERE c.post_id = p.id) AS comment_count,
        EXISTS (
          SELECT 1 FROM post_upvotes pu2
          WHERE pu2.post_id = p.id AND pu2.user_id = $1
        ) AS user_has_upvoted,
        EXISTS (
          SELECT 1 FROM post_bookmarks bm
          WHERE bm.post_id = p.id AND bm.user_id = $1
        ) AS user_has_bookmarked,
        (SELECT COUNT(*)::int FROM post_bookmarks bm2 WHERE bm2.post_id = p.id) AS bookmark_count
      FROM posts p
      INNER JOIN users u ON u.id = p.user_id
    `;
    const params = [req.user.id];
    const conds = [];

    if (scope.kind === 'global') {
      conds.push('p.college_id IS NULL');
    } else {
      conds.push('p.college_id = $' + (params.length + 1));
      params.push(scope.collegeId);
    }

    if (tagFilter) {
      conds.push('p.tag = $' + (params.length + 1));
      params.push(tagFilter);
    }

    if (conds.length) {
      query += ` WHERE ${conds.join(' AND ')}`;
    }

    query += ` ORDER BY p.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('getPosts error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getBookmarkedPosts = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT
        p.*,
        CASE WHEN p.is_anonymous THEN 'Anonymous Learner' ELSE u.name END AS author_name,
        (SELECT COUNT(*)::int FROM post_upvotes pu WHERE pu.post_id = p.id) AS upvote_count,
        (SELECT COUNT(*)::int FROM comments c WHERE c.post_id = p.id) AS comment_count,
        EXISTS (
          SELECT 1 FROM post_upvotes pu2
          WHERE pu2.post_id = p.id AND pu2.user_id = $1
        ) AS user_has_upvoted,
        true AS user_has_bookmarked,
        (SELECT COUNT(*)::int FROM post_bookmarks bm2 WHERE bm2.post_id = p.id) AS bookmark_count
      FROM posts p
      INNER JOIN users u ON u.id = p.user_id
      INNER JOIN post_bookmarks bm ON bm.post_id = p.id AND bm.user_id = $1
      ORDER BY p.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
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

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query('SELECT id, tag, college_id FROM posts WHERE id = $1 FOR UPDATE', [
      postId
    ]);
    if (found.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Post not found.' });
    }
    const tag = found.rows[0].tag;
    const postCollegeId = found.rows[0].college_id;
    await client.query('DELETE FROM posts WHERE id = $1', [postId]);
    await decrementTagPostCount(client, tag, postCollegeId);
    await client.query('COMMIT');
    res.json({ ok: true, id: postId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('adminDeletePost error:', error);
    res.status(500).json({ error: 'Server error.' });
  } finally {
    client.release();
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
  const img =
    imageUrl && typeof imageUrl === 'string' && imageUrl.trim()
      ? imageUrl.trim()
      : null;

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
        return res.status(403).json({
          error: "Read-Only: You cannot post in another college's forum."
        });
      }
      postCollegeId = n;
    }
  }

  let trimmedTag;
  try {
    const existingTags = Array.from(
      await gatherForumTagSet(req.user.college_id, postCollegeId)
    ).sort((a, b) => a.localeCompare(b));
    const rawTag = await callAssignTagService(
      `${trimmedTitle}\n\n${trimmedContent}`,
      existingTags
    );
    trimmedTag = normalizeForumTag(rawTag);
  } catch (e) {
    return res.status(e.httpStatus || 503).json({ error: e.message || 'Tag assignment unavailable.' });
  }

  const anonFee = isAnonymous ? ANONYMOUS_POST_FEE : 0;
  const totalCharge = bounty + anonFee;

  if (totalCharge === 0) {
    try {
      const result = await pool.query(
        `INSERT INTO posts (user_id, college_id, title, content, image_url, tag, bounty, is_anonymous)
         VALUES ($1, $2, $3, $4, $5, $6, 0, $7)
         RETURNING id`,
        [userId, postCollegeId, trimmedTitle, trimmedContent, img, trimmedTag, isAnonymous]
      );
      await upsertTagPostCount(pool, trimmedTag, postCollegeId);

      // Fire-and-forget: generate audio summary in background
      const newPostId = result.rows[0].id;
      generateAudioSummary(`${trimmedTitle}\n\n${trimmedContent}`)
        .then(audioUrl => {
          if (audioUrl) {
            pool.query('UPDATE posts SET audio_url = $1 WHERE id = $2', [audioUrl, newPostId])
              .catch(err => console.error('[AudioSummary] DB update failed:', err));
          }
        })
        .catch(err => console.error('[AudioSummary] Pipeline error:', err));

      const enriched = await fetchPostEnriched(newPostId, userId);
      return res.status(201).json(enriched);
    } catch (error) {
      console.error('createPost error:', error);
      return res.status(500).json({ error: 'Server error.' });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lock = await client.query(
      'SELECT credits FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );
    if (lock.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found.' });
    }
    const credits = lock.rows[0].credits;
    if (credits < totalCharge) {
      await client.query('ROLLBACK');
      const parts = [];
      if (bounty > 0) parts.push('bounty');
      if (anonFee > 0) parts.push('anonymous posting fee');
      return res.status(400).json({
        error: `Insufficient credits for this post (${parts.join(' and ')}).`
      });
    }

    await client.query('UPDATE users SET credits = credits - $1 WHERE id = $2', [
      totalCharge,
      userId
    ]);
    if (bounty > 0) {
      await client.query(
        `INSERT INTO transactions (user_id, credits_used, reason)
         VALUES ($1, $2, $3)`,
        [userId, bounty, 'Nexus Board post bounty']
      );
    }
    if (anonFee > 0) {
      await client.query(
        `INSERT INTO transactions (user_id, credits_used, reason)
         VALUES ($1, $2, $3)`,
        [userId, anonFee, 'Nexus anonymous post']
      );
    }

    const insert = await client.query(
      `INSERT INTO posts (user_id, college_id, title, content, image_url, tag, bounty, is_anonymous)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [userId, postCollegeId, trimmedTitle, trimmedContent, img, trimmedTag, bounty, isAnonymous]
    );

    await upsertTagPostCount(client, trimmedTag, postCollegeId);

    await client.query('COMMIT');

    // Fire-and-forget: generate audio summary in background
    const newPostId = insert.rows[0].id;
    generateAudioSummary(`${trimmedTitle}\n\n${trimmedContent}`)
      .then(audioUrl => {
        if (audioUrl) {
          pool.query('UPDATE posts SET audio_url = $1 WHERE id = $2', [audioUrl, newPostId])
            .catch(err => console.error('[AudioSummary] DB update failed:', err));
        }
      })
      .catch(err => console.error('[AudioSummary] Pipeline error:', err));

    const enriched = await fetchPostEnriched(newPostId, userId);
    res.status(201).json(enriched);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('createPost (transaction) error:', error);
    res.status(500).json({ error: 'Server error.' });
  } finally {
    client.release();
  }
};

function parseParentCommentId(body) {
  const raw = body.parent_comment_id ?? body.parentCommentId;
  if (raw === undefined || raw === null || raw === '') return null;
  const n = parseInt(String(raw), 10);
  if (Number.isNaN(n) || n <= 0) return NaN;
  return n;
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
  if (parentParsed !== null) {
    parentCommentId = parentParsed;
  }

  if (Number.isNaN(postId)) {
    return res.status(400).json({ error: 'Invalid post id.' });
  }
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

  const selectCommentRow = (commentId) =>
    pool.query(
      `SELECT c.*,
        CASE WHEN c.is_anonymous THEN 'Anonymous Learner' ELSE u.name END AS author_name,
        (u.email = $2) AS is_ai_tutor
       FROM comments c
       INNER JOIN users u ON u.id = c.user_id
       WHERE c.id = $1`,
      [commentId, GHOST_AI_EMAIL]
    );

  try {
    const postCheck = await pool.query('SELECT id, college_id FROM posts WHERE id = $1', [postId]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found.' });
    }
    const postRow = postCheck.rows[0];
    const isGhostUser = req.user.email === GHOST_AI_EMAIL;
    if (
      postRow.college_id != null &&
      postRow.college_id !== req.user.college_id &&
      !isGhostUser
    ) {
      return res.status(403).json({
        error: "Read-Only: You cannot post in another college's forum."
      });
    }

    if (parentCommentId != null) {
      const parentRes = await pool.query(
        'SELECT id, post_id FROM comments WHERE id = $1',
        [parentCommentId]
      );
      if (parentRes.rows.length === 0) {
        return res.status(400).json({ error: 'Parent comment not found.' });
      }
      if (parentRes.rows[0].post_id !== postId) {
        return res.status(400).json({ error: 'Parent comment does not belong to this post.' });
      }
    }

    if (anonFee === 0) {
      const insert = await pool.query(
        `INSERT INTO comments (post_id, user_id, content, is_anonymous, parent_comment_id)
         VALUES ($1, $2, $3, false, $4)
         RETURNING id`,
        [postId, userId, trimmedBody, parentCommentId]
      );
      const withAuthor = await selectCommentRow(insert.rows[0].id);
      return res.status(201).json(withAuthor.rows[0]);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const lock = await client.query(
        'SELECT credits FROM users WHERE id = $1 FOR UPDATE',
        [userId]
      );
      if (lock.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User not found.' });
      }
      if (lock.rows[0].credits < anonFee) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient credits for anonymous comment.' });
      }
      await client.query('UPDATE users SET credits = credits - $1 WHERE id = $2', [
        anonFee,
        userId
      ]);
      await client.query(
        `INSERT INTO transactions (user_id, credits_used, reason)
         VALUES ($1, $2, $3)`,
        [userId, anonFee, 'Nexus anonymous comment']
      );
      const insert = await client.query(
        `INSERT INTO comments (post_id, user_id, content, is_anonymous, parent_comment_id)
         VALUES ($1, $2, $3, true, $4)
         RETURNING id`,
        [postId, userId, trimmedBody, parentCommentId]
      );
      await client.query('COMMIT');
      const withAuthor = await selectCommentRow(insert.rows[0].id);
      res.status(201).json(withAuthor.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('addComment error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getComments = async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  if (Number.isNaN(postId)) {
    return res.status(400).json({ error: 'Invalid post id.' });
  }

  try {
    const postCheck = await pool.query('SELECT id FROM posts WHERE id = $1', [postId]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const viewerId = req.user.id;
    const result = await pool.query(
      `SELECT c.*,
        CASE WHEN c.is_anonymous THEN 'Anonymous Learner' ELSE u.name END AS author_name,
        (u.email = $2) AS is_ai_tutor,
        COALESCE((SELECT COUNT(*)::int FROM comment_upvotes cu WHERE cu.comment_id = c.id), 0) AS like_count,
        EXISTS(
          SELECT 1 FROM comment_upvotes cu
          WHERE cu.comment_id = c.id AND cu.user_id = $3
        ) AS user_has_liked
       FROM comments c
       INNER JOIN users u ON u.id = c.user_id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [postId, GHOST_AI_EMAIL, viewerId]
    );
    res.json(result.rows);
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

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const c = await client.query(
      'SELECT id FROM comments WHERE id = $1 AND post_id = $2 FOR UPDATE',
      [commentId, postId]
    );
    if (c.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Comment not found.' });
    }

    const del = await client.query(
      'DELETE FROM comment_upvotes WHERE user_id = $1 AND comment_id = $2 RETURNING *',
      [userId, commentId]
    );

    let liked = false;
    if (del.rowCount === 0) {
      await client.query(
        'INSERT INTO comment_upvotes (user_id, comment_id) VALUES ($1, $2)',
        [userId, commentId]
      );
      liked = true;
    }

    const countRes = await client.query(
      'SELECT COUNT(*)::int AS c FROM comment_upvotes WHERE comment_id = $1',
      [commentId]
    );

    await client.query('COMMIT');
    res.json({ liked, likeCount: countRes.rows[0].c });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('toggleCommentUpvote error:', error);
    res.status(500).json({ error: 'Server error.' });
  } finally {
    client.release();
  }
};

exports.toggleBookmark = async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  if (Number.isNaN(postId)) {
    return res.status(400).json({ error: 'Invalid post id.' });
  }

  const userId = req.user.id;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const postCheck = await client.query('SELECT id FROM posts WHERE id = $1', [postId]);
    if (postCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Post not found.' });
    }

    const del = await client.query(
      'DELETE FROM post_bookmarks WHERE user_id = $1 AND post_id = $2 RETURNING *',
      [userId, postId]
    );

    let bookmarked = false;
    if (del.rowCount === 0) {
      await client.query(
        'INSERT INTO post_bookmarks (user_id, post_id) VALUES ($1, $2)',
        [userId, postId]
      );
      bookmarked = true;
    }

    const countRes = await client.query(
      'SELECT COUNT(*)::int AS c FROM post_bookmarks WHERE post_id = $1',
      [postId]
    );

    await client.query('COMMIT');
    res.json({ bookmarked, bookmarkCount: countRes.rows[0].c });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('toggleBookmark error:', error);
    res.status(500).json({ error: 'Server error.' });
  } finally {
    client.release();
  }
};

exports.toggleUpvote = async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  if (Number.isNaN(postId)) {
    return res.status(400).json({ error: 'Invalid post id.' });
  }

  const userId = req.user.id;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const postCheck = await client.query('SELECT id FROM posts WHERE id = $1', [postId]);
    if (postCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Post not found.' });
    }

    const del = await client.query(
      'DELETE FROM post_upvotes WHERE user_id = $1 AND post_id = $2 RETURNING *',
      [userId, postId]
    );

    let upvoted = false;
    if (del.rowCount === 0) {
      await client.query(
        'INSERT INTO post_upvotes (user_id, post_id) VALUES ($1, $2)',
        [userId, postId]
      );
      upvoted = true;
    }

    const countRes = await client.query(
      'SELECT COUNT(*)::int AS c FROM post_upvotes WHERE post_id = $1',
      [postId]
    );

    await client.query('COMMIT');
    res.json({ upvoted, upvoteCount: countRes.rows[0].c });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('toggleUpvote error:', error);
    res.status(500).json({ error: 'Server error.' });
  } finally {
    client.release();
  }
};

exports.resolvePost = async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const commentId = parseInt(req.body.commentId, 10);

  if (Number.isNaN(postId)) {
    return res.status(400).json({ error: 'Invalid post id.' });
  }
  if (Number.isNaN(commentId)) {
    return res.status(400).json({ error: 'commentId is required.' });
  }

  const ownerId = req.user.id;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const postRes = await client.query(
      'SELECT * FROM posts WHERE id = $1 FOR UPDATE',
      [postId]
    );
    if (postRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Post not found.' });
    }

    const post = postRes.rows[0];
    if (post.user_id !== ownerId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only the post owner can resolve the bounty.' });
    }
    if (post.is_solved) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'This post is already resolved.' });
    }

    const commentRes = await client.query(
      'SELECT * FROM comments WHERE id = $1 FOR UPDATE',
      [commentId]
    );
    if (commentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Comment not found.' });
    }

    const comment = commentRes.rows[0];
    if (comment.post_id !== postId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Comment does not belong to this post.' });
    }
    if (comment.parent_comment_id != null) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Only a top-level comment can be marked as the accepted answer for a bounty.'
      });
    }

    await client.query('UPDATE posts SET is_solved = TRUE WHERE id = $1', [postId]);
    await client.query(
      'UPDATE comments SET is_accepted_answer = FALSE WHERE post_id = $1',
      [postId]
    );
    await client.query(
      'UPDATE comments SET is_accepted_answer = TRUE WHERE id = $1',
      [commentId]
    );

    const bounty = post.bounty || 0;
    if (bounty > 0) {
      await client.query(
        'UPDATE users SET credits = credits + $1 WHERE id = $2',
        [bounty, comment.user_id]
      );
      await client.query(
        `INSERT INTO transactions (user_id, credits_added, reason)
         VALUES ($1, $2, $3)`,
        [comment.user_id, bounty, 'Nexus Board bounty awarded']
      );
    }

    await client.query('COMMIT');

    const enriched = await fetchPostEnriched(postId, ownerId);

    const roomTag = (post.tag || '').trim() || '#General';
    const questionBody = `${post.title || ''}\n\n${post.content || ''}`.trim();
    const answerBody = String(comment.content || '').trim();
    void fetch(`${AI_BACKEND_URL}/api/ai/community/ingest-solution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tag: roomTag,
        question: questionBody,
        answer: answerBody
      })
    }).catch((err) => console.error('ingest-solution (Room Mascot):', err));

    res.json({
      post: enriched,
      acceptedCommentId: commentId
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('resolvePost error:', error);
    res.status(500).json({ error: 'Server error.' });
  } finally {
    client.release();
  }
};

exports.mascotChat = async (req, res) => {
  const tag = typeof req.body?.tag === 'string' ? req.body.tag.trim() : '';
  const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
  if (!tag || tag === '#All') {
    return res.status(400).json({ error: 'A specific room tag is required.' });
  }
  if (!query) {
    return res.status(400).json({ error: 'query is required.' });
  }

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
      const raw = data.detail ?? data.error ?? 'Mascot chat failed.';
      const msg =
        typeof raw === 'string'
          ? raw
          : Array.isArray(raw)
            ? raw.map((x) => x?.msg || x?.message || JSON.stringify(x)).join('; ')
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
