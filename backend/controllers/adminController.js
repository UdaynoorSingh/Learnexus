const pool = require('../config/db');

exports.getPendingNotes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, u.name as uploader_name, t.name as topic_name 
       FROM notes n 
       JOIN users u ON n.uploaded_by = u.id 
       JOIN topics t ON n.topic_id = t.id 
       WHERE n.is_verified = FALSE 
       ORDER BY n.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.verifyNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const { verified } = req.body;

    if (verified) {
      await pool.query('UPDATE notes SET is_verified = TRUE WHERE id = $1', [noteId]);

      const note = await pool.query('SELECT uploaded_by FROM notes WHERE id = $1', [noteId]);
      if (note.rows.length > 0) {
        await pool.query('UPDATE users SET credits = credits + 3 WHERE id = $1', [note.rows[0].uploaded_by]);
        await pool.query(
          'INSERT INTO transactions (user_id, credits_added, reason) VALUES ($1, 3, $2)',
          [note.rows[0].uploaded_by, 'Note verified by admin']
        );
      }

      res.json({ message: 'Note approved.' });
    } else {
      await pool.query('DELETE FROM notes WHERE id = $1', [noteId]);
      res.json({ message: 'Note rejected and deleted.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    await pool.query('DELETE FROM notes WHERE id = $1', [noteId]);
    res.json({ message: 'Note deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.createDegree = async (req, res) => {
  try {
    const { name } = req.body;
    const result = await pool.query(
      'INSERT INTO degrees (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.createBranch = async (req, res) => {
  try {
    const { name, degreeId } = req.body;
    const result = await pool.query(
      'INSERT INTO branches (name, degree_id) VALUES ($1, $2) RETURNING *',
      [name, degreeId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};


exports.createSemester = async (req, res) => {
  try {
    const { number, branchId } = req.body;
    const result = await pool.query(
      'INSERT INTO semesters (number, branch_id) VALUES ($1, $2) RETURNING *',
      [number, branchId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};


exports.createSubject = async (req, res) => {
  try {
    const { name, semesterId } = req.body;
    const result = await pool.query(
      'INSERT INTO subjects (name, semester_id) VALUES ($1, $2) RETURNING *',
      [name, semesterId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};


exports.createTopic = async (req, res) => {
  try {
    const { name, subjectId, parentTopicId, teacherId } = req.body;
    const result = await pool.query(
      'INSERT INTO topics (name, subject_id, parent_topic_id, teacher_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, subjectId, parentTopicId || null, teacherId || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};


exports.getAllNotes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, u.name as uploader_name, t.name as topic_name 
       FROM notes n 
       JOIN users u ON n.uploaded_by = u.id 
       JOIN topics t ON n.topic_id = t.id 
       ORDER BY n.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};


exports.getStats = async (req, res) => {
  try {
    const users = await pool.query('SELECT COUNT(*) FROM users');
    const notes = await pool.query('SELECT COUNT(*) FROM notes');
    const topics = await pool.query('SELECT COUNT(*) FROM topics');
    const pendingNotes = await pool.query('SELECT COUNT(*) FROM notes WHERE is_verified = FALSE');

    res.json({
      totalUsers: parseInt(users.rows[0].count),
      totalNotes: parseInt(notes.rows[0].count),
      totalTopics: parseInt(topics.rows[0].count),
      pendingNotes: parseInt(pendingNotes.rows[0].count)
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};


exports.getChartStats = async (req, res) => {
  try {
    
    const uploadsRes = await pool.query(`
      SELECT TO_CHAR(created_at, 'MM-DD') as date, COUNT(*) as count 
      FROM notes 
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY TO_CHAR(created_at, 'MM-DD') 
      ORDER BY date ASC
    `);

    
    const usersRes = await pool.query(`
      SELECT TO_CHAR(created_at, 'MM-DD') as date, COUNT(*) as count 
      FROM users 
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY TO_CHAR(created_at, 'MM-DD') 
      ORDER BY date ASC
    `);

    res.json({
      uploadsData: uploadsRes.rows.map(r => ({ date: r.date, uploads: parseInt(r.count) })),
      usersData: usersRes.rows.map(r => ({ date: r.date, users: parseInt(r.count) }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error.' });
  }
};
