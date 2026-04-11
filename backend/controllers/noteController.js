const pool = require('../config/db');
const path = require('path');
const fs = require('fs');

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

    const topicCheck = await pool.query(
      `SELECT t.id, t.college_id FROM topics t
       JOIN subjects s ON t.subject_id = s.id
       JOIN semesters sem ON s.semester_id = sem.id
       JOIN branches b ON sem.branch_id = b.id
       JOIN degrees d ON b.degree_id = d.id
       WHERE t.id = $1`,
      [topicId]
    );
    if (topicCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Topic not found.' });
    }

    const topicData = topicCheck.rows[0];
    if (req.user.role !== 'superadmin' && topicData.college_id !== req.user.college_id) {
      return res.status(404).json({ error: 'Topic not found in your college.' });
    }

    const cid = topicData.college_id;

    const fileUrl = req.file.path;

    const result = await pool.query(
      'INSERT INTO notes (topic_id, uploaded_by, file_url, college_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [topicId, userId, fileUrl, cid]
    );

    const note = result.rows[0];
    const io = req.app.get('io');
    io.to(userId).emit('ai-progress', { step: 'Upload Complete', message: 'Note saved. Starting AI extraction...' });

    try {
      const aiUrl = process.env.AI_BACKEND_URL || 'http://localhost:5001';
      
      processNoteWithAI(note.id, fileUrl, aiUrl, io, userId, topicId).catch(err => {
        console.error('AI processing error:', err);
        io.to(userId).emit('ai-error', { message: 'AI processing failed.' });
      });
    } catch (err) {
      console.error('AI trigger error:', err);
    }

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

async function processNoteWithAI(noteId, fileUrl, aiUrl, io, userId, topicId) {
  try {
    const { default: fetch } = await import('node-fetch');
    const mimeType = fileUrl.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';

    io.to(userId).emit('ai-progress', { step: 'Extracting Text', message: 'Running OCR Vision Models via URL...' });
    const ocrRes = await fetch(`${aiUrl}/api/ai/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileUrl, mimeType })
    });
    const ocrData = await ocrRes.json();
    const extractedText = ocrData.text || '';

    if (!extractedText) {
      await pool.query('UPDATE notes SET extracted_text = $1 WHERE id = $2', ['Could not extract text', noteId]);
      io.to(userId).emit('ai-error', { message: 'Failed to extract text from document.' });
      return;
    }

    io.to(userId).emit('ai-progress', { step: 'Vectorizing', message: 'Building FAISS knowledge base...' });
    try {
      await fetch(`${aiUrl}/api/ai/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: extractedText, topicId })
      });
    } catch (embedError) {
      console.error('FAISS Embed Error (soft fail):', embedError);
    }

    io.to(userId).emit('ai-progress', { step: 'Summarizing', message: 'Generating clear summary...' });
    const sumRes = await fetch(`${aiUrl}/api/ai/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: extractedText })
    });
    const sumData = await sumRes.json();

    io.to(userId).emit('ai-progress', { step: 'Key Points', message: 'Isolating key takeaways...' });
    const kpRes = await fetch(`${aiUrl}/api/ai/keypoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: extractedText })
    });
    const kpData = await kpRes.json();

    const wordCount = extractedText.split(/\s+/).length;
    let qualityScore = Math.min(100, Math.floor(wordCount / 10) + 20);
    if (sumData.summary && sumData.summary.length > 50) qualityScore += 10;
    if (kpData.keyPoints && kpData.keyPoints.length > 3) qualityScore += 10;
    qualityScore = Math.min(100, qualityScore);

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

    console.log(`AI processing complete for note ${noteId}`);
    io.to(userId).emit('ai-success', { noteId, message: 'Processing fully completed!' });
  } catch (error) {
    console.error(`AI processing failed for note ${noteId}:`, error.message);
    io.to(userId).emit('ai-error', { message: 'An error occurred during AI sequence.' });
  }
}


exports.getNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    
    let queryArgs = [noteId];
    let queryStr = `SELECT n.*, u.name as uploader_name, t.name as topic_name
       FROM notes n
       JOIN users u ON n.uploaded_by = u.id
       JOIN topics t ON n.topic_id = t.id
       WHERE n.id = $1`;

    if (req.user.role !== 'superadmin') {
      const cid = req.user.college_id;
      queryStr += ` AND n.college_id = $2`;
      queryArgs.push(cid);
    }

    const result = await pool.query(queryStr, queryArgs);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('getNote error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};


exports.unlockNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const userId = req.user.id;

    let checkQueryArgs = [noteId];
    let checkQueryStr = 'SELECT id, college_id FROM notes WHERE id = $1';

    if (req.user.role !== 'superadmin') {
      checkQueryStr += ' AND college_id = $2';
      checkQueryArgs.push(req.user.college_id);
    }

    const noteCheck = await pool.query(checkQueryStr, checkQueryArgs);
    if (noteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    const userResult = await pool.query('SELECT credits FROM users WHERE id = $1', [userId]);
    if (userResult.rows[0].credits < 2) {
      return res.status(400).json({ error: 'Insufficient credits. You need 2 credits to unlock.' });
    }

    await pool.query('UPDATE users SET credits = credits - 2 WHERE id = $1', [userId]);
    await pool.query(
      'INSERT INTO transactions (user_id, credits_used, reason) VALUES ($1, 2, $2)',
      [userId, `Unlocked note #${noteId}`]
    );

    const note = await pool.query('SELECT * FROM notes WHERE id = $1', [noteId]);
    res.json({ note: note.rows[0], message: 'Note unlocked!' });
  } catch (error) {
    console.error('unlockNote error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};
