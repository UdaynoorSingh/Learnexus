const pool = require('../config/db');
const { generateAudioDirect } = require('../utils/generateAudioSummary');


exports.getLibraryPosts = async (req, res) => {
  try {
    const scope = (req.query.scope || 'college').toLowerCase();
    const viewerId = req.user.id;

    let query = `
      SELECT lp.*,
        u.name AS author_name,
        COALESCE((SELECT COUNT(*)::int FROM library_post_votes v WHERE v.post_id = lp.id AND v.vote_type = 'like'), 0) AS like_count,
        COALESCE((SELECT COUNT(*)::int FROM library_post_votes v WHERE v.post_id = lp.id AND v.vote_type = 'dislike'), 0) AS dislike_count,
        (SELECT vote_type FROM library_post_votes v WHERE v.post_id = lp.id AND v.user_id = $1) AS user_vote
      FROM library_posts lp
      INNER JOIN users u ON u.id = lp.user_id
    `;
    const params = [viewerId];

    if (scope === 'global') {
      query += ` WHERE lp.college_id IS NULL`;
    } else {
      query += ` WHERE lp.college_id = $2`;
      params.push(req.user.college_id);
    }

    query += ` ORDER BY lp.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
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

    const viewerId = req.user.id;
    const result = await pool.query(
      `SELECT lp.*, u.name AS author_name,
        COALESCE((SELECT COUNT(*)::int FROM library_post_votes v WHERE v.post_id = lp.id AND v.vote_type = 'like'), 0) AS like_count,
        COALESCE((SELECT COUNT(*)::int FROM library_post_votes v WHERE v.post_id = lp.id AND v.vote_type = 'dislike'), 0) AS dislike_count,
        (SELECT vote_type FROM library_post_votes v WHERE v.post_id = lp.id AND v.user_id = $2) AS user_vote
       FROM library_posts lp
       INNER JOIN users u ON u.id = lp.user_id
       WHERE lp.id = $1`,
      [postId, viewerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Library post not found.' });
    }

    res.json(result.rows[0]);
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

    const trimmedTopic = topic.trim().slice(0, 255);
    const trimmedDesc = description.trim();
    const trimmedContent = content.trim();

    let postCollegeId = req.user.college_id;
    if (req.body.scope === 'global') {
      postCollegeId = null;
    }

    const result = await pool.query(
      `INSERT INTO library_posts (user_id, college_id, topic, description, content, difficulty)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, postCollegeId, trimmedTopic, trimmedDesc, trimmedContent, trimmedDifficulty]
    );

    const newPost = result.rows[0];

    generateAudioDirect(trimmedDesc)
      .then(audioUrl => {
        if (audioUrl) {
          pool.query('UPDATE library_posts SET audio_url = $1 WHERE id = $2', [audioUrl, newPost.id])
            .then(() => console.log(`[NexusLibrary] Audio ready for post #${newPost.id}`))
            .catch(err => console.error('[NexusLibrary] DB update failed:', err));
        }
      })
      .catch(err => console.error('[NexusLibrary] Audio pipeline error:', err));

    const enriched = await pool.query(
      `SELECT lp.*, u.name AS author_name,
        0 AS like_count, 0 AS dislike_count, NULL AS user_vote
       FROM library_posts lp
       INNER JOIN users u ON u.id = lp.user_id
       WHERE lp.id = $1`,
      [newPost.id]
    );

    res.status(201).json(enriched.rows[0]);
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
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const postCheck = await client.query('SELECT id FROM library_posts WHERE id = $1', [postId]);
    if (postCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Post not found.' });
    }

    const existing = await client.query(
      'SELECT vote_type FROM library_post_votes WHERE user_id = $1 AND post_id = $2',
      [userId, postId]
    );

    let userVote = null;

    if (existing.rows.length > 0) {
      if (existing.rows[0].vote_type === voteType) {
        await client.query(
          'DELETE FROM library_post_votes WHERE user_id = $1 AND post_id = $2',
          [userId, postId]
        );
        userVote = null;
      } else {
        await client.query(
          'UPDATE library_post_votes SET vote_type = $1 WHERE user_id = $2 AND post_id = $3',
          [voteType, userId, postId]
        );
        userVote = voteType;
      }
    } else {
      await client.query(
        'INSERT INTO library_post_votes (user_id, post_id, vote_type) VALUES ($1, $2, $3)',
        [userId, postId, voteType]
      );
      userVote = voteType;
    }

    const likes = await client.query(
      "SELECT COUNT(*)::int AS c FROM library_post_votes WHERE post_id = $1 AND vote_type = 'like'",
      [postId]
    );
    const dislikes = await client.query(
      "SELECT COUNT(*)::int AS c FROM library_post_votes WHERE post_id = $1 AND vote_type = 'dislike'",
      [postId]
    );

    await client.query('COMMIT');

    res.json({
      like_count: likes.rows[0].c,
      dislike_count: dislikes.rows[0].c,
      user_vote: userVote
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('voteLibraryPost error:', error);
    res.status(500).json({ error: 'Server error.' });
  } finally {
    client.release();
  }
};


exports.deleteLibraryPost = async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  if (Number.isNaN(postId)) {
    return res.status(400).json({ error: 'Invalid post id.' });
  }

  const userId = req.user.id;

  try {
    const postCheck = await pool.query(
      'SELECT id, user_id FROM library_posts WHERE id = $1',
      [postId]
    );

    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    if (postCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Only the post owner can delete this post.' });
    }

    await pool.query('DELETE FROM library_posts WHERE id = $1', [postId]);

    res.json({ ok: true, id: postId });
  } catch (error) {
    console.error('deleteLibraryPost error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};
