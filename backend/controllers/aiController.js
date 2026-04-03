const fetch = require('node-fetch');

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
