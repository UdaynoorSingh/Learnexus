const pool = require('../config/db');


exports.getChallenges = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cc.*,
        COALESCE(
          (SELECT COUNT(*)::int FROM challenge_submissions cs WHERE cs.challenge_id = cc.id),
          0
        ) AS submission_count
      FROM company_challenges cc
      ORDER BY cc.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('getChallenges error:', error);
    res.status(500).json({ error: 'Server error fetching challenges.' });
  }
};


exports.submitChallenge = async (req, res) => {
  try {
    const { challenge_id, github_url } = req.body;
    const userId = req.user.id;

    if (!challenge_id || !Number.isInteger(Number(challenge_id))) {
      return res.status(400).json({ error: 'Valid challenge_id is required.' });
    }

    if (!github_url || typeof github_url !== 'string' || !github_url.trim()) {
      return res.status(400).json({ error: 'A valid GitHub URL is required.' });
    }

    const trimmedUrl = github_url.trim();

    try {
      const parsed = new URL(trimmedUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return res.status(400).json({ error: 'URL must use http or https protocol.' });
      }
    } catch {
      return res.status(400).json({ error: 'Invalid URL format.' });
    }

    const challengeCheck = await pool.query(
      'SELECT id FROM company_challenges WHERE id = $1',
      [challenge_id]
    );

    if (challengeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Challenge not found.' });
    }

    const existingSubmission = await pool.query(
      'SELECT id FROM challenge_submissions WHERE challenge_id = $1 AND user_id = $2',
      [challenge_id, userId]
    );

    if (existingSubmission.rows.length > 0) {
      return res.status(409).json({ error: 'You have already submitted a solution for this challenge.' });
    }

    const result = await pool.query(
      `INSERT INTO challenge_submissions (challenge_id, user_id, github_url, status)
       VALUES ($1, $2, $3, 'Pending')
       RETURNING *`,
      [challenge_id, userId, trimmedUrl]
    );

    res.status(201).json({
      message: 'Solution submitted successfully! It will be reviewed shortly.',
      submission: result.rows[0]
    });
  } catch (error) {
    console.error('submitChallenge error:', error);
    res.status(500).json({ error: 'Server error submitting challenge solution.' });
  }
};
