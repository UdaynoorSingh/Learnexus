const pool = require('../config/db');

exports.getDegrees = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM degrees ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('getDegrees error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getBranches = async (req, res) => {
  try {
    const { degreeId } = req.params;
    const result = await pool.query(
      'SELECT b.*, d.name as degree_name FROM branches b JOIN degrees d ON b.degree_id = d.id WHERE b.degree_id = $1 ORDER BY b.name',
      [degreeId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('getBranches error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getSemesters = async (req, res) => {
  try {
    const { branchId } = req.params;
    const result = await pool.query(
      'SELECT s.*, b.name as branch_name FROM semesters s JOIN branches b ON s.branch_id = b.id WHERE s.branch_id = $1 ORDER BY s.number',
      [branchId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('getSemesters error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getSubjects = async (req, res) => {
  try {
    const { semesterId } = req.params;
    const result = await pool.query(
      `SELECT s.*, sem.number as semester_number, 
       (SELECT COUNT(*) FROM topics t WHERE t.subject_id = s.id) as topic_count
       FROM subjects s 
       JOIN semesters sem ON s.semester_id = sem.id 
       WHERE s.semester_id = $1 ORDER BY s.name`,
      [semesterId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('getSubjects error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getTopics = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const result = await pool.query(
      `SELECT t.*, 
       (SELECT COUNT(*) FROM notes n WHERE n.topic_id = t.id) as note_count,
       (SELECT COUNT(*) FROM topics sub WHERE sub.parent_topic_id = t.id) as subtopic_count
       FROM topics t 
       WHERE t.subject_id = $1 AND t.parent_topic_id IS NULL 
       ORDER BY t.name`,
      [subjectId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('getTopics error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getTopic = async (req, res) => {
  try {
    const { topicId } = req.params;
    
    const topicResult = await pool.query(
      `SELECT t.*, s.name as subject_name, 
       te.name as teacher_name
       FROM topics t 
       JOIN subjects s ON t.subject_id = s.id 
       LEFT JOIN teachers te ON t.teacher_id = te.id 
       WHERE t.id = $1`,
      [topicId]
    );

    if (topicResult.rows.length === 0) {
      return res.status(404).json({ error: 'Topic not found.' });
    }

    const subtopics = await pool.query(
      'SELECT * FROM topics WHERE parent_topic_id = $1 ORDER BY name',
      [topicId]
    );

    const notes = await pool.query(
      `SELECT n.*, u.name as uploader_name 
       FROM notes n 
       JOIN users u ON n.uploaded_by = u.id 
       WHERE n.topic_id = $1 
       ORDER BY n.created_at DESC`,
      [topicId]
    );

    const related = await pool.query(
      `SELECT t.*, tr.relation_type 
       FROM topic_relations tr 
       JOIN topics t ON (t.id = tr.topic_id_2 AND tr.topic_id_1 = $1) 
                     OR (t.id = tr.topic_id_1 AND tr.topic_id_2 = $1)
       WHERE tr.topic_id_1 = $1 OR tr.topic_id_2 = $1`,
      [topicId]
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
