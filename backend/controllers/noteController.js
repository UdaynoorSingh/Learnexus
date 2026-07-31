const { Topic, Note, User, Transaction } = require('../models');
const { leanDoc } = require('../utils/mongoHelpers');

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

    const topic = await Topic.findOne({ id: Number(topicId) });
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found.' });
    }

    if (req.user.role !== 'superadmin' && topic.college_id !== req.user.college_id) {
      return res.status(404).json({ error: 'Topic not found in your college.' });
    }

    const fileUrl = req.file.path;
    const note = await Note.create({
      topic_id: Number(topicId),
      uploaded_by: userId,
      file_url: fileUrl,
      college_id: topic.college_id
    });

    const io = req.app.get('io');
    io.to(userId).emit('ai-progress', { step: 'Upload Complete', message: 'Note saved. Starting AI extraction...' });

    try {
      const aiUrl = process.env.AI_BACKEND_URL || 'http://localhost:5001';
      processNoteWithAI(note.id, fileUrl, aiUrl, io, userId, topicId).catch((err) => {
        console.error('AI processing error:', err);
        io.to(userId).emit('ai-error', { message: 'AI processing failed.' });
      });
    } catch (err) {
      console.error('AI trigger error:', err);
    }

    await User.findOneAndUpdate({ id: userId }, { $inc: { credits: 5 } });
    await Transaction.create({ user_id: userId, credits_added: 5, reason: 'Uploaded a note' });

    res.status(201).json({ note: leanDoc(note), message: 'Note uploaded. AI processing started.' });
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
      await Note.updateOne({ id: noteId }, { extracted_text: 'Could not extract text' });
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

    await Note.updateOne(
      { id: noteId },
      {
        extracted_text: extractedText,
        summary: sumData.summary || '',
        key_points: kpData.keyPoints || [],
        quality_score: qualityScore
      }
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
    const filter = { id: Number(noteId) };
    if (req.user.role !== 'superadmin') {
      filter.college_id = req.user.college_id;
    }

    const note = await Note.findOne(filter);
    if (!note) return res.status(404).json({ error: 'Note not found.' });

    const uploader = note.uploaded_by ? await User.findOne({ id: note.uploaded_by }) : null;
    const topic = note.topic_id ? await Topic.findOne({ id: note.topic_id }) : null;

    res.json({
      ...leanDoc(note),
      uploader_name: uploader?.name || null,
      topic_name: topic?.name || null
    });
  } catch (error) {
    console.error('getNote error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.unlockNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const userId = req.user.id;

    const filter = { id: Number(noteId) };
    if (req.user.role !== 'superadmin') {
      filter.college_id = req.user.college_id;
    }

    const note = await Note.findOne(filter);
    if (!note) return res.status(404).json({ error: 'Note not found.' });

    const user = await User.findOne({ id: userId });
    if ((user?.credits ?? 0) < 2) {
      return res.status(400).json({ error: 'Insufficient credits. You need 2 credits to unlock.' });
    }

    await User.findOneAndUpdate({ id: userId }, { $inc: { credits: -2 } });
    await Transaction.create({ user_id: userId, credits_used: 2, reason: `Unlocked note #${noteId}` });

    const updated = await Note.findOne({ id: Number(noteId) });
    res.json({ note: leanDoc(updated), message: 'Note unlocked!' });
  } catch (error) {
    console.error('unlockNote error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};
