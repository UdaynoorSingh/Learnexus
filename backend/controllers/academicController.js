const { College, Degree, Branch, Semester, Subject, Topic, Teacher, Note, TopicRelation, User } = require('../models');
const { leanDoc, leanDocs } = require('../utils/mongoHelpers');

async function pickDefaultCatalogCollegeId() {
  const demo = await College.findOne({ domain_suffix: 'demo.edu' });
  if (demo) return demo.id;
  const first = await College.findOne().sort({ id: 1 });
  return first?.id ?? null;
}

async function resolveViewerCollegeId(req) {
  const myCollegeId = req.user.college_id;
  let cid = null;

  if (req.query.collegeId != null && req.query.collegeId !== '') {
    const n = parseInt(String(req.query.collegeId), 10);
    if (!Number.isNaN(n)) {
      if (req.user.role === 'superadmin') return n;
      if (myCollegeId != null && Number(myCollegeId) === n) cid = n;
    }
  }

  if (cid == null) {
    if (req.user.role === 'superadmin') return await pickDefaultCatalogCollegeId();
    const fromUser = myCollegeId != null && myCollegeId !== '' ? Number(myCollegeId) : null;
    cid = fromUser != null && !Number.isNaN(fromUser) ? fromUser : await pickDefaultCatalogCollegeId();
  }

  if (cid == null || Number.isNaN(cid)) return await pickDefaultCatalogCollegeId();

  const degreeCount = await Degree.countDocuments({ college_id: cid });
  if (degreeCount === 0) {
    const fallback = await pickDefaultCatalogCollegeId();
    if (fallback != null) return fallback;
  }

  return cid;
}

exports.getDegrees = async (req, res) => {
  try {
    const cid = await resolveViewerCollegeId(req);
    const degrees = await Degree.find({ college_id: cid }).sort({ name: 1 });
    res.json(leanDocs(degrees));
  } catch (error) {
    console.error('getDegrees error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getBranches = async (req, res) => {
  try {
    const cid = await resolveViewerCollegeId(req);
    const { degreeId } = req.params;
    const branches = await Branch.find({ degree_id: Number(degreeId), college_id: cid }).sort({ name: 1 });
    const degree = await Degree.findOne({ id: Number(degreeId), college_id: cid });
    const rows = leanDocs(branches).map((b) => ({ ...b, degree_name: degree?.name || null }));
    res.json(rows);
  } catch (error) {
    console.error('getBranches error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getSemesters = async (req, res) => {
  try {
    const cid = await resolveViewerCollegeId(req);
    const { branchId } = req.params;
    const semesters = await Semester.find({ branch_id: Number(branchId), college_id: cid }).sort({ number: 1 });
    const branch = await Branch.findOne({ id: Number(branchId), college_id: cid });
    const rows = leanDocs(semesters).map((s) => ({ ...s, branch_name: branch?.name || null }));
    res.json(rows);
  } catch (error) {
    console.error('getSemesters error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getSubjects = async (req, res) => {
  try {
    const cid = await resolveViewerCollegeId(req);
    const { semesterId } = req.params;
    const subjects = await Subject.find({ semester_id: Number(semesterId), college_id: cid }).sort({ name: 1 });
    const sem = await Semester.findOne({ id: Number(semesterId), college_id: cid });
    const rows = await Promise.all(
      leanDocs(subjects).map(async (s) => {
        const topicCount = await Topic.countDocuments({ subject_id: s.id, college_id: cid });
        return { ...s, semester_number: sem?.number ?? null, topic_count: topicCount };
      })
    );
    res.json(rows);
  } catch (error) {
    console.error('getSubjects error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getTopics = async (req, res) => {
  try {
    const cid = await resolveViewerCollegeId(req);
    const { subjectId } = req.params;
    const topics = await Topic.find({
      subject_id: Number(subjectId),
      college_id: cid,
      $or: [{ parent_topic_id: null }, { parent_topic_id: { $exists: false } }]
    }).sort({ name: 1 });
    const rows = await Promise.all(
      leanDocs(topics).map(async (t) => {
        const [noteCount, subtopicCount] = await Promise.all([
          Note.countDocuments({ topic_id: t.id, college_id: cid }),
          Topic.countDocuments({ parent_topic_id: t.id, college_id: cid })
        ]);
        return { ...t, note_count: noteCount, subtopic_count: subtopicCount };
      })
    );
    res.json(rows);
  } catch (error) {
    console.error('getTopics error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getTopic = async (req, res) => {
  try {
    const cid = await resolveViewerCollegeId(req);
    const { topicId } = req.params;

    const topic = await Topic.findOne({ id: Number(topicId), college_id: cid });
    if (!topic) return res.status(404).json({ error: 'Topic not found.' });

    const subject = await Subject.findOne({ id: topic.subject_id, college_id: cid });
    const teacher = topic.teacher_id
      ? await Teacher.findOne({ id: topic.teacher_id, college_id: cid })
      : null;

    const topicRow = { ...leanDoc(topic), subject_name: subject?.name || null, teacher_name: teacher?.name || null };

    const subtopics = await Topic.find({ parent_topic_id: topic.id, college_id: cid }).sort({ name: 1 });
    const notes = await Note.find({ topic_id: topic.id, college_id: cid }).sort({ created_at: -1 });
    const noteRows = await Promise.all(
      leanDocs(notes).map(async (n) => {
        const uploader = n.uploaded_by ? await User.findOne({ id: n.uploaded_by }) : null;
        return { ...n, uploader_name: uploader?.name || null };
      })
    );

    const relations = await TopicRelation.find({
      $or: [{ topic_id_1: topic.id }, { topic_id_2: topic.id }]
    });
    const relatedTopics = [];
    for (const rel of relations) {
      const otherId = rel.topic_id_1 === topic.id ? rel.topic_id_2 : rel.topic_id_1;
      const t = await Topic.findOne({ id: otherId, college_id: cid });
      if (t) relatedTopics.push({ ...leanDoc(t), relation_type: rel.relation_type });
    }

    res.json({
      topic: topicRow,
      subtopics: leanDocs(subtopics),
      notes: noteRows,
      relatedTopics
    });
  } catch (error) {
    console.error('getTopic error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};
