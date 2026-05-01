const pool = require('../config/db');

function isSuperAdmin(user) {
  return user && user.role === 'superadmin';
}

function resolveNotesCollegeFilter(req) {
  if (isSuperAdmin(req.user)) {
    if (req.query.collegeId != null && req.query.collegeId !== '') {
      const n = parseInt(req.query.collegeId, 10);
      return Number.isNaN(n) ? req.user.college_id : n;
    }
    return null;
  }
  return req.user.college_id;
}

function targetCollegeIdForWrites(req) {
  if (isSuperAdmin(req.user) && req.body.collegeId != null && req.body.collegeId !== '') {
    const n = parseInt(req.body.collegeId, 10);
    if (!Number.isNaN(n)) return n;
  }
  return req.user.college_id;
}

async function assertNoteAdminAccess(req, noteId) {
  const r = await pool.query('SELECT id, college_id, uploaded_by FROM notes WHERE id = $1', [noteId]);
  if (r.rows.length === 0) {
    return { ok: false, status: 404, error: 'Note not found.' };
  }
  const row = r.rows[0];
  if (isSuperAdmin(req.user)) return { ok: true, row };
  if (row.college_id !== req.user.college_id) {
    return { ok: false, status: 403, error: 'Forbidden.' };
  }
  return { ok: true, row };
}

exports.getCollegesAdmin = async (req, res) => {
  try {
    if (isSuperAdmin(req.user)) {
      const result = await pool.query(
        'SELECT id, name, domain_suffix, created_at FROM colleges ORDER BY name'
      );
      return res.json(result.rows);
    }
    if (req.user.role === 'admin' && req.user.college_id != null) {
      const result = await pool.query(
        'SELECT id, name, domain_suffix, created_at FROM colleges WHERE id = $1',
        [req.user.college_id]
      );
      return res.json(result.rows);
    }
    return res.status(403).json({ error: 'Forbidden.' });
  } catch (error) {
    console.error('getCollegesAdmin error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.createCollegeAdmin = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ error: 'Only a superadmin can manage colleges.' });
    }
    const { name, domain_suffix: domainSuffix } = req.body;
    if (!name || !domainSuffix) {
      return res.status(400).json({ error: 'name and domain_suffix are required.' });
    }
    const result = await pool.query(
      'INSERT INTO colleges (name, domain_suffix) VALUES ($1, LOWER(TRIM($2))) RETURNING *',
      [String(name).trim(), String(domainSuffix).trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A college with this domain suffix already exists.' });
    }
    console.error('createCollegeAdmin error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.updateCollegeAdmin = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ error: 'Only a superadmin can manage colleges.' });
    }
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id.' });
    const { name, domain_suffix: domainSuffix } = req.body;
    const fields = [];
    const vals = [];
    let i = 1;
    if (name != null) {
      fields.push(`name = $${i++}`);
      vals.push(String(name).trim());
    }
    if (domainSuffix != null) {
      fields.push(`domain_suffix = LOWER(TRIM($${i++}))`);
      vals.push(String(domainSuffix).trim());
    }
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }
    vals.push(id);
    const result = await pool.query(
      `UPDATE colleges SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      vals
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'College not found.' });
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A college with this domain suffix already exists.' });
    }
    console.error('updateCollegeAdmin error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.deleteCollegeAdmin = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ error: 'Only a superadmin can manage colleges.' });
    }
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id.' });
    const result = await pool.query('DELETE FROM colleges WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'College not found.' });
    res.json({ ok: true, id });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(409).json({ error: 'Cannot delete college: dependent records exist.' });
    }
    console.error('deleteCollegeAdmin error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getPendingNotes = async (req, res) => {
  try {
    const cf = resolveNotesCollegeFilter(req);
    const result = await pool.query(
      `SELECT n.*, u.name as uploader_name, t.name as topic_name
       FROM notes n
       JOIN users u ON n.uploaded_by = u.id
       JOIN topics t ON n.topic_id = t.id
       WHERE n.is_verified = FALSE
       AND ($1::int IS NULL OR n.college_id = $1)
       ORDER BY n.created_at DESC`,
      [cf]
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
    const access = await assertNoteAdminAccess(req, noteId);
    if (!access.ok) return res.status(access.status).json({ error: access.error });

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
    const access = await assertNoteAdminAccess(req, noteId);
    if (!access.ok) return res.status(access.status).json({ error: access.error });
    await pool.query('DELETE FROM notes WHERE id = $1', [noteId]);
    res.json({ message: 'Note deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.createDegree = async (req, res) => {
  const client = await pool.connect();
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required.' });
    const cid = targetCollegeIdForWrites(req);
    await client.query('BEGIN');
    const result = await client.query(
      'INSERT INTO degrees (name, college_id) VALUES ($1, $2) RETURNING *',
      [String(name).trim(), cid]
    );
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Server error.' });
  } finally {
    client.release();
  }
};

exports.createBranch = async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, degreeId } = req.body;
    if (!name || degreeId == null) {
      return res.status(400).json({ error: 'name and degreeId are required.' });
    }
    const cid = targetCollegeIdForWrites(req);
    await client.query('BEGIN');
    const d = await client.query('SELECT college_id FROM degrees WHERE id = $1', [degreeId]);
    if (d.rows.length === 0 || d.rows[0].college_id !== cid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid degree for this college.' });
    }
    const result = await client.query(
      'INSERT INTO branches (name, degree_id, college_id) VALUES ($1, $2, $3) RETURNING *',
      [String(name).trim(), degreeId, cid]
    );
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Server error.' });
  } finally {
    client.release();
  }
};

exports.createSemester = async (req, res) => {
  const client = await pool.connect();
  try {
    const { number, branchId } = req.body;
    if (number == null || branchId == null) {
      return res.status(400).json({ error: 'number and branchId are required.' });
    }
    const cid = targetCollegeIdForWrites(req);
    await client.query('BEGIN');
    const b = await client.query('SELECT college_id FROM branches WHERE id = $1', [branchId]);
    if (b.rows.length === 0 || b.rows[0].college_id !== cid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid branch for this college.' });
    }
    const result = await client.query(
      'INSERT INTO semesters (number, branch_id, college_id) VALUES ($1, $2, $3) RETURNING *',
      [number, branchId, cid]
    );
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Server error.' });
  } finally {
    client.release();
  }
};

exports.createSubject = async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, semesterId } = req.body;
    if (!name || semesterId == null) {
      return res.status(400).json({ error: 'name and semesterId are required.' });
    }
    const cid = targetCollegeIdForWrites(req);
    await client.query('BEGIN');
    const s = await client.query('SELECT college_id FROM semesters WHERE id = $1', [semesterId]);
    if (s.rows.length === 0 || s.rows[0].college_id !== cid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid semester for this college.' });
    }
    const result = await client.query(
      'INSERT INTO subjects (name, semester_id, college_id) VALUES ($1, $2, $3) RETURNING *',
      [String(name).trim(), semesterId, cid]
    );
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Server error.' });
  } finally {
    client.release();
  }
};

exports.createTopic = async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, subjectId, parentTopicId, teacherId } = req.body;
    if (!name || subjectId == null) {
      return res.status(400).json({ error: 'name and subjectId are required.' });
    }
    const cid = targetCollegeIdForWrites(req);
    await client.query('BEGIN');
    const sub = await client.query('SELECT college_id FROM subjects WHERE id = $1', [subjectId]);
    if (sub.rows.length === 0 || sub.rows[0].college_id !== cid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid subject for this college.' });
    }
    if (teacherId != null) {
      const te = await client.query(
        'SELECT college_id, subject_id FROM teachers WHERE id = $1',
        [teacherId]
      );
      if (
        te.rows.length === 0 ||
        te.rows[0].college_id !== cid ||
        (te.rows[0].subject_id != null && te.rows[0].subject_id !== parseInt(subjectId, 10))
      ) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid teacher for this subject/college.' });
      }
    }
    const result = await client.query(
      'INSERT INTO topics (name, subject_id, parent_topic_id, teacher_id, college_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [String(name).trim(), subjectId, parentTopicId || null, teacherId || null, cid]
    );
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Server error.' });
  } finally {
    client.release();
  }
};

exports.getAllNotes = async (req, res) => {
  try {
    const cf = resolveNotesCollegeFilter(req);
    const result = await pool.query(
      `SELECT n.*, u.name as uploader_name, t.name as topic_name
       FROM notes n
       JOIN users u ON n.uploaded_by = u.id
       JOIN topics t ON n.topic_id = t.id
       WHERE ($1::int IS NULL OR n.college_id = $1)
       ORDER BY n.created_at DESC`,
      [cf]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const cf = resolveNotesCollegeFilter(req);
    const users = await pool.query(
      cf == null
        ? 'SELECT COUNT(*) FROM users'
        : 'SELECT COUNT(*) FROM users WHERE college_id = $1',
      cf == null ? [] : [cf]
    );
    const notes = await pool.query(
      cf == null ? 'SELECT COUNT(*) FROM notes' : 'SELECT COUNT(*) FROM notes WHERE college_id = $1',
      cf == null ? [] : [cf]
    );
    const topics = await pool.query(
      cf == null ? 'SELECT COUNT(*) FROM topics' : 'SELECT COUNT(*) FROM topics WHERE college_id = $1',
      cf == null ? [] : [cf]
    );
    const pendingNotes = await pool.query(
      cf == null
        ? 'SELECT COUNT(*) FROM notes WHERE is_verified = FALSE'
        : 'SELECT COUNT(*) FROM notes WHERE is_verified = FALSE AND college_id = $1',
      cf == null ? [] : [cf]
    );

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
    const cf = resolveNotesCollegeFilter(req);
    const uploadsRes = await pool.query(
      cf == null
        ? `
      SELECT TO_CHAR(created_at, 'MM-DD') as date, COUNT(*) as count
      FROM notes
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY TO_CHAR(created_at, 'MM-DD')
      ORDER BY date ASC
    `
        : `
      SELECT TO_CHAR(created_at, 'MM-DD') as date, COUNT(*) as count
      FROM notes
      WHERE college_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY TO_CHAR(created_at, 'MM-DD')
      ORDER BY date ASC
    `,
      cf == null ? [] : [cf]
    );

    const usersRes = await pool.query(
      cf == null
        ? `
      SELECT TO_CHAR(created_at, 'MM-DD') as date, COUNT(*) as count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY TO_CHAR(created_at, 'MM-DD')
      ORDER BY date ASC
    `
        : `
      SELECT TO_CHAR(created_at, 'MM-DD') as date, COUNT(*) as count
      FROM users
      WHERE college_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY TO_CHAR(created_at, 'MM-DD')
      ORDER BY date ASC
    `,
      cf == null ? [] : [cf]
    );

    res.json({
      uploadsData: uploadsRes.rows.map((r) => ({ date: r.date, uploads: parseInt(r.count) })),
      usersData: usersRes.rows.map((r) => ({ date: r.date, users: parseInt(r.count) }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.createChallenge = async (req, res) => {
  try {
    const { company_name, title, description, difficulty, bounty_credits, tags } = req.body;
    if (!company_name || !title || !description || !difficulty) {
      return res.status(400).json({ error: 'Missing required challenge fields.' });
    }
    
    let tagsJSON = tags;
    if (Array.isArray(tags)) tagsJSON = JSON.stringify(tags);
    if (!tagsJSON) tagsJSON = '[]';
    
    let credits = parseInt(bounty_credits, 10);
    if (isNaN(credits)) credits = 5;

    const query = `
      INSERT INTO company_challenges (company_name, title, description, difficulty, bounty_credits, tags)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [company_name, title, description, difficulty, credits, tagsJSON];

    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('createChallenge error:', error);
    res.status(500).json({ error: 'Server error creating company challenge.' });
  }
};

exports.updateChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_name, title, description, difficulty, bounty_credits, tags } = req.body;
    
    let tagsJSON = tags;
    if (Array.isArray(tags)) tagsJSON = JSON.stringify(tags);
    if (!tagsJSON) tagsJSON = '[]';
    
    let credits = parseInt(bounty_credits, 10);
    if (isNaN(credits)) credits = 5;

    const query = `
      UPDATE company_challenges 
      SET company_name = COALESCE($1, company_name),
          title = COALESCE($2, title),
          description = COALESCE($3, description),
          difficulty = COALESCE($4, difficulty),
          bounty_credits = COALESCE($5, bounty_credits),
          tags = COALESCE($6, tags)
      WHERE id = $7
      RETURNING *
    `;
    const values = [company_name, title, description, difficulty, credits, tagsJSON, id];
    
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Challenge not found.' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateChallenge error:', err);
    res.status(500).json({ error: 'Server error updating challenge.' });
  }
};

exports.deleteChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM challenge_submissions WHERE challenge_id = $1', [id]);
    const result = await pool.query('DELETE FROM company_challenges WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Challenge not found.' });
    }
    res.json({ message: 'Challenge deleted successfully.' });
  } catch (err) {
    console.error('deleteChallenge error:', err);
    res.status(500).json({ error: 'Server error deleting challenge.' });
  }
};
