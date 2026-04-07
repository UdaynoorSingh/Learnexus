const pool = require('../config/db');

const AI_BACKEND_URL = process.env.AI_BACKEND_URL || 'http://localhost:5001';

exports.teach = async (req, res) => {
  try {
    const { topicName, context } = req.body;
    
    // Proxy request securely to Python microservice
    const response = await fetch(`${AI_BACKEND_URL}/api/ai/teach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicName, context })
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

exports.chat = async (req, res) => {
  try {
    const { topicId, history, message, lectureContext } = req.body;
    
    // Proxy request securely to Python microservice
    const response = await fetch(`${AI_BACKEND_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId, history, message, lectureContext })
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
    // Check user credits before proxying
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

    // Deduct 1 credit only after successful generation
    await pool.query('UPDATE users SET credits = credits - 1 WHERE id = $1', [req.user.id]);

    res.json(data);
  } catch (error) {
    console.error('AI Proxy Exam error:', error);
    res.status(500).json({ error: 'Failed to generate exam.' });
  }
};
