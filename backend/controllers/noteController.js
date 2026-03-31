const pool = require('../config/db');
const path = require('path');
const fs = require('fs');

// Upload a note
exports.uploadNote = async (req, res) => {
  try {
    const { topicId } = req.body;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    if (!topicId) {
      return res.status(400).json({ error: 'Topic ID is required.' });
    }

    // Check topic exists
    const topicCheck = await pool.query('SELECT id FROM topics WHERE id = $1', [topicId]);
    if (topicCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Topic not found.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    // Insert note
    const result = await pool.query(
      'INSERT INTO notes (topic_id, uploaded_by, file_url) VALUES ($1, $2, $3) RETURNING *',
      [topicId, userId, fileUrl]
    );

    const note = result.rows[0];

    // Trigger AI processing in background
    try {
      const aiUrl = process.env.AI_BACKEND_URL || 'http://localhost:5001';
      const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);

      // Process asynchronously
      processNoteWithAI(note.id, filePath, aiUrl).catch(err => {
        console.error('AI processing error:', err);
      });
    } catch (err) {
      console.error('AI trigger error:', err);
    }

    // Add credits for upload
    await pool.query('UPDATE users SET credits = credits + 5 WHERE id = $1', [userId]);
    await pool.query(
      'INSERT INTO transactions (user_id, credits_added, reason) VALUES ($1, 5, $2)',
      [userId, 'Uploaded a note']
    );

    res.status(201).json({ note, message: 'Note uploaded. AI processing started.' });
  } catch (error) {
    console.error('uploadNote error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

// AI processing helper
async function processNoteWithAI(noteId, filePath, aiUrl) {
  try {
    const { default: fetch } = await import('node-fetch');
    const fileBuffer = fs.readFileSync(filePath);
    const base64 = fileBuffer.toString('base64');
    const mimeType = filePath.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';

    // Step 1: OCR
    const ocrRes = await fetch(`${aiUrl}/api/ai/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64, mimeType })
    });
    const ocrData = await ocrRes.json();
    const extractedText = ocrData.text || '';

    if (!extractedText) {
      await pool.query('UPDATE notes SET extracted_text = $1 WHERE id = $2', ['Could not extract text', noteId]);
      return;
    }

    // Step 2: Summary
    const sumRes = await fetch(`${aiUrl}/api/ai/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: extractedText })
    });
    const sumData = await sumRes.json();

    // Step 3: Key Points
    const kpRes = await fetch(`${aiUrl}/api/ai/keypoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: extractedText })
    });
    const kpData = await kpRes.json();

    // Calculate quality score (basic heuristic)
    const wordCount = extractedText.split(/\s+/).length;
    let qualityScore = Math.min(100, Math.floor(wordCount / 10) + 20);
    if (sumData.summary && sumData.summary.length > 50) qualityScore += 10;
    if (kpData.keyPoints && kpData.keyPoints.length > 3) qualityScore += 10;
    qualityScore = Math.min(100, qualityScore);

    // Update note in DB
    await pool.query(
      `UPDATE notes SET 
        extracted_text = $1, 
        summary = $2, 
        key_points = $3, 
        quality_score = $4 
       WHERE id = $5`,
      [
        extractedText,
        sumData.summary || '',
        JSON.stringify(kpData.keyPoints || []),
        qualityScore,
        noteId
      ]
    );

    console.log(`✅ AI processing complete for note ${noteId}`);
  } catch (error) {
    console.error(`AI processing failed for note ${noteId}:`, error.message);
  }
}

// Get note by ID
exports.getNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const result = await pool.query(
      `SELECT n.*, u.name as uploader_name, t.name as topic_name 
       FROM notes n 
       JOIN users u ON n.uploaded_by = u.id 
       JOIN topics t ON n.topic_id = t.id 
       WHERE n.id = $1`,
      [noteId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('getNote error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Unlock note (spend credits)
exports.unlockNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const userId = req.user.id;

    // Check credits
    const userResult = await pool.query('SELECT credits FROM users WHERE id = $1', [userId]);
    if (userResult.rows[0].credits < 2) {
      return res.status(400).json({ error: 'Insufficient credits. You need 2 credits to unlock.' });
    }

    // Deduct credits
    await pool.query('UPDATE users SET credits = credits - 2 WHERE id = $1', [userId]);
    await pool.query(
      'INSERT INTO transactions (user_id, credits_used, reason) VALUES ($1, 2, $2)',
      [userId, `Unlocked note #${noteId}`]
    );

    // Get note
    const note = await pool.query('SELECT * FROM notes WHERE id = $1', [noteId]);
    res.json({ note: note.rows[0], message: 'Note unlocked!' });
  } catch (error) {
    console.error('unlockNote error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};
