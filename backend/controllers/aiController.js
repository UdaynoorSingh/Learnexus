const pool = require('../config/db');

const AI_BACKEND_URL = process.env.AI_BACKEND_URL || 'http://localhost:5001';

exports.teach = async (req, res) => {
  try {
    const { topicId, topicName, contextMode, context } = req.body;
    const response = await fetch(`${AI_BACKEND_URL}/api/ai/teach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId, topicName, contextMode, context })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Backend Error: ${errorText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('AI Proxy Teach error:', error);
    res.status(500).json({ error: 'Failed to communicate with AI server.' });
  }
};

exports.taskIdeas = async (req, res) => {
  try {
    const { prompt } = req.body;
    const response = await fetch(`${AI_BACKEND_URL}/api/ai/task-ideas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Backend Error: ${errorText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('AI Proxy TaskIdeas error:', error);
    res.status(500).json({ error: 'Failed to generate task ideas.' });
  }
};

exports.nexGuide = async (req, res) => {
  try {
    const { query, currentPath } = req.body;
    const response = await fetch(`${AI_BACKEND_URL}/api/ai/nex-guide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, currentPath })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Backend Error: ${errorText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('AI Proxy NexGuide error:', error);
    res.status(500).json({ error: 'Failed to get Nex guide response.' });
  }
};

exports.chat = async (req, res) => {
  try {
    const { topicId, contextMode, history, message, lectureContext } = req.body;
    const response = await fetch(`${AI_BACKEND_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId, contextMode, history, message, lectureContext })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Backend Error: ${errorText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('AI Proxy Chat error:', error);
    res.status(500).json({ error: 'Failed to communicate with AI server.' });
  }
};

exports.flashcards = async (req, res) => {
  try {
    const { topicId } = req.body;

    const response = await fetch(`${AI_BACKEND_URL}/api/ai/flashcards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: errData.detail || 'AI backend error.' });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('AI Proxy Flashcards error:', error);
    res.status(500).json({ error: 'Failed to generate flashcards.' });
  }
};

exports.examGenerate = async (req, res) => {
  try {
    const creditCheck = await pool.query('SELECT credits FROM users WHERE id = $1', [req.user.id]);
    const userCredits = creditCheck.rows[0]?.credits || 0;

    if (userCredits < 1) {
      return res.status(403).json({ error: 'Not enough credits! Upload more notes to earn credits.' });
    }

    const { topicId } = req.body;

    const response = await fetch(`${AI_BACKEND_URL}/api/ai/exam/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: errData.detail || 'AI backend error.' });
    }

    const data = await response.json();

    await pool.query('UPDATE users SET credits = credits - 1 WHERE id = $1', [req.user.id]);

    res.json(data);
  } catch (error) {
    console.error('AI Proxy Exam error:', error);
    res.status(500).json({ error: 'Failed to generate exam.' });
  }
};

exports.youtubeEmbed = async (req, res) => {
  try {
    const creditCheck = await pool.query('SELECT credits FROM users WHERE id = $1', [req.user.id]);
    const userCredits = creditCheck.rows[0]?.credits || 0;

    if (userCredits < 5) {
      return res.status(403).json({ error: 'Not enough credits! You need 5 credits to process a YouTube video. Upload more notes to earn credits.' });
    }

    const { url, topicId } = req.body;

    if (!url || !topicId) {
      return res.status(400).json({ error: 'Missing YouTube URL or topicId.' });
    }

    const response = await fetch(`${AI_BACKEND_URL}/api/ai/youtube/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, topicId })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: errData.detail || 'Failed to process YouTube video.' });
    }

    const data = await response.json();

    await pool.query('UPDATE users SET credits = credits - 5 WHERE id = $1', [req.user.id]);

    res.json(data);
  } catch (error) {
    console.error('AI Proxy YouTube error:', error);
    res.status(500).json({ error: 'Failed to process YouTube video.' });
  }
};

exports.mindmap = async (req, res) => {
  try {
    const creditCheck = await pool.query('SELECT credits FROM users WHERE id = $1', [req.user.id]);
    const userCredits = creditCheck.rows[0]?.credits || 0;

    if (userCredits < 2) {
      return res.status(403).json({ error: 'Not enough credits! You need 2 credits to generate a mind map. Upload more notes to earn credits.' });
    }

    const { topicId } = req.body;

    if (!topicId) {
      return res.status(400).json({ error: 'Missing topicId.' });
    }

    const response = await fetch(`${AI_BACKEND_URL}/api/ai/mindmap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: errData.detail || 'Failed to generate mind map.' });
    }

    const data = await response.json();

    await pool.query('UPDATE users SET credits = credits - 2 WHERE id = $1', [req.user.id]);

    res.json(data);
  } catch (error) {
    console.error('AI Proxy Mindmap error:', error);
    res.status(500).json({ error: 'Failed to generate mind map.' });
  }
};

exports.podcast = async (req, res) => {
  try {
    const creditCheck = await pool.query('SELECT credits FROM users WHERE id = $1', [req.user.id]);
    const userCredits = creditCheck.rows[0]?.credits || 0;

    if (userCredits < 3) {
      return res.status(403).json({ error: 'Not enough credits! You need 3 credits to generate an audio overview. Upload more notes to earn credits.' });
    }

    const { topicId } = req.body;

    if (!topicId) {
      return res.status(400).json({ error: 'Missing topicId.' });
    }

    const response = await fetch(`${AI_BACKEND_URL}/api/ai/podcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: errData.detail || 'Failed to generate audio overview.' });
    }

    const data = await response.json();

    await pool.query('UPDATE users SET credits = credits - 3 WHERE id = $1', [req.user.id]);

    res.json(data);
  } catch (error) {
    console.error('AI Proxy Podcast error:', error);
    res.status(500).json({ error: 'Failed to generate audio overview.' });
  }
};
