const pool = require('../config/db');

async function pickDefaultCatalogCollegeId() {
  const demo = await pool.query(
    `SELECT id FROM colleges WHERE LOWER(domain_suffix) = 'demo.edu' LIMIT 1`
  );
  if (demo.rows.length > 0) return demo.rows[0].id;
  const first = await pool.query(`SELECT id FROM colleges ORDER BY id ASC LIMIT 1`);
  if (first.rows.length > 0) return first.rows[0].id;
  return null;
}


async function resolveViewerCollegeId(req) {
  const myCollegeId = req.user.college_id;
  let cid = null;

  if (req.query.collegeId != null && req.query.collegeId !== '') {
    const n = parseInt(String(req.query.collegeId), 10);
    if (!Number.isNaN(n)) {
      if (req.user.role === 'superadmin') {
        return n;
      }
      if (myCollegeId != null && Number(myCollegeId) === n) {
        cid = n;
      }
    }
  }

  if (cid == null) {
    if (req.user.role === 'superadmin') {
      return await pickDefaultCatalogCollegeId();
    }
    const fromUser =
      myCollegeId != null && myCollegeId !== '' ? Number(myCollegeId) : null;
    if (fromUser != null && !Number.isNaN(fromUser)) {
      cid = fromUser;
    } else {
      cid = await pickDefaultCatalogCollegeId();
    }
  }

  if (cid == null || Number.isNaN(cid)) {
    return await pickDefaultCatalogCollegeId();
  }

  const degreeCount = await pool.query(
    'SELECT COUNT(*)::int AS n FROM degrees WHERE college_id = $1',
    [cid]
  );
  if ((degreeCount.rows[0]?.n ?? 0) === 0) {
    const fallback = await pickDefaultCatalogCollegeId();
    if (fallback != null) return fallback;
  }

  return cid;
}

exports.getDegrees = async (req, res) => {
  try {
    const cid = await resolveViewerCollegeId(req);
    const result = await pool.query(
      'SELECT * FROM degrees WHERE college_id = $1 ORDER BY name',
      [cid]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('getDegrees error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getBranches = async (req, res) => {
  try {
    const cid = await resolveViewerCollegeId(req);
    const { degreeId } = req.params;
    const result = await pool.query(
      `SELECT b.*, d.name as degree_name
       FROM branches b
       JOIN degrees d ON b.degree_id = d.id
       WHERE b.degree_id = $1 AND b.college_id = $2 AND d.college_id = $2
       ORDER BY b.name`,
      [degreeId, cid]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('getBranches error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getSemesters = async (req, res) => {
  try {
    const cid = await resolveViewerCollegeId(req);
    const { branchId } = req.params;
    const result = await pool.query(
      `SELECT s.*, b.name as branch_name
       FROM semesters s
       JOIN branches b ON s.branch_id = b.id
       WHERE s.branch_id = $1 AND s.college_id = $2 AND b.college_id = $2
       ORDER BY s.number`,
      [branchId, cid]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('getSemesters error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getSubjects = async (req, res) => {
  try {
    const cid = await resolveViewerCollegeId(req);
    const { semesterId } = req.params;
    const result = await pool.query(
      `SELECT s.*, sem.number as semester_number,
       (SELECT COUNT(*) FROM topics t WHERE t.subject_id = s.id AND t.college_id = $2) as topic_count
       FROM subjects s
       JOIN semesters sem ON s.semester_id = sem.id
       WHERE s.semester_id = $1 AND s.college_id = $2 AND sem.college_id = $2
       ORDER BY s.name`,
      [semesterId, cid]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('getSubjects error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getTopics = async (req, res) => {
  try {
    const cid = await resolveViewerCollegeId(req);
    const { subjectId } = req.params;
    const result = await pool.query(
      `SELECT t.*,
       (SELECT COUNT(*) FROM notes n WHERE n.topic_id = t.id AND n.college_id = $2) as note_count,
       (SELECT COUNT(*) FROM topics sub WHERE sub.parent_topic_id = t.id AND sub.college_id = $2) as subtopic_count
       FROM topics t
       JOIN subjects subj ON t.subject_id = subj.id
       WHERE t.subject_id = $1 AND t.parent_topic_id IS NULL AND t.college_id = $2 AND subj.college_id = $2
       ORDER BY t.name`,
      [subjectId, cid]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('getTopics error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getTopic = async (req, res) => {
  try {
    const cid = await resolveViewerCollegeId(req);
    const { topicId } = req.params;

    const topicResult = await pool.query(
      `SELECT t.*, s.name as subject_name,
       te.name as teacher_name
       FROM topics t
       JOIN subjects s ON t.subject_id = s.id
       JOIN semesters sem ON s.semester_id = sem.id
       JOIN branches b ON sem.branch_id = b.id
       JOIN degrees d ON b.degree_id = d.id
       LEFT JOIN teachers te ON t.teacher_id = te.id AND te.college_id = $2
       WHERE t.id = $1 AND t.college_id = $2 AND s.college_id = $2 AND sem.college_id = $2
         AND b.college_id = $2 AND d.college_id = $2`,
      [topicId, cid]
    );

    if (topicResult.rows.length === 0) {
      return res.status(404).json({ error: 'Topic not found.' });
    }

    const subtopics = await pool.query(
      'SELECT * FROM topics WHERE parent_topic_id = $1 AND college_id = $2 ORDER BY name',
      [topicId, cid]
    );

    const notes = await pool.query(
      `SELECT n.*, u.name as uploader_name
       FROM notes n
       JOIN users u ON n.uploaded_by = u.id
       WHERE n.topic_id = $1 AND n.college_id = $2
       ORDER BY n.created_at DESC`,
      [topicId, cid]
    );

    const related = await pool.query(
      `SELECT t.*, tr.relation_type
       FROM topic_relations tr
       JOIN topics t ON (
         (t.id = tr.topic_id_2 AND tr.topic_id_1 = $1) OR
         (t.id = tr.topic_id_1 AND tr.topic_id_2 = $1)
       )
       WHERE (tr.topic_id_1 = $1 OR tr.topic_id_2 = $1) AND t.college_id = $2`,
      [topicId, cid]
    );

    res.json({
      topic: topicResult.rows[0],
      subtopics: subtopics.rows,
      notes: notes.rows,
      relatedTopics: related.rows
    });
  } catch (error) {
    console.error('getTopic error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};
