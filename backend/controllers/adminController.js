const {
  College,
  User,
  Note,
  Topic,
  Degree,
  Branch,
  Semester,
  Subject,
  Teacher,
  Transaction,
  CompanyChallenge,
  ChallengeSubmission
} = require('../models');
const { leanDoc, leanDocs, isDuplicateKeyError, aggregateByDay } = require('../utils/mongoHelpers');

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
  const row = await Note.findOne({ id: Number(noteId) });
  if (!row) return { ok: false, status: 404, error: 'Note not found.' };
  if (isSuperAdmin(req.user)) return { ok: true, row: leanDoc(row) };
  if (row.college_id !== req.user.college_id) {
    return { ok: false, status: 403, error: 'Forbidden.' };
  }
  return { ok: true, row: leanDoc(row) };
}

async function enrichNote(n) {
  const uploader = n.uploaded_by ? await User.findOne({ id: n.uploaded_by }) : null;
  const topic = n.topic_id ? await Topic.findOne({ id: n.topic_id }) : null;
  return {
    ...leanDoc(n),
    uploader_name: uploader?.name || null,
    topic_name: topic?.name || null
  };
}

exports.getCollegesAdmin = async (req, res) => {
  try {
    if (isSuperAdmin(req.user)) {
      const colleges = await College.find().sort({ name: 1 });
      return res.json(leanDocs(colleges));
    }
    if (req.user.role === 'admin' && req.user.college_id != null) {
      const college = await College.findOne({ id: req.user.college_id });
      return res.json(college ? [leanDoc(college)] : []);
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
    const college = await College.create({
      name: String(name).trim(),
      domain_suffix: String(domainSuffix).trim().toLowerCase()
    });
    res.status(201).json(leanDoc(college));
  } catch (error) {
    if (isDuplicateKeyError(error)) {
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

    const college = await College.findOne({ id });
    if (!college) return res.status(404).json({ error: 'College not found.' });
    if (name != null) college.name = String(name).trim();
    if (domainSuffix != null) college.domain_suffix = String(domainSuffix).trim().toLowerCase();
    await college.save();
    res.json(leanDoc(college));
  } catch (error) {
    if (isDuplicateKeyError(error)) {
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

    const userCount = await User.countDocuments({ college_id: id });
    if (userCount > 0) {
      return res.status(409).json({ error: 'Cannot delete college: dependent records exist.' });
    }

    const del = await College.findOneAndDelete({ id });
    if (!del) return res.status(404).json({ error: 'College not found.' });
    res.json({ ok: true, id });
  } catch (error) {
    console.error('deleteCollegeAdmin error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getPendingNotes = async (req, res) => {
  try {
    const cf = resolveNotesCollegeFilter(req);
    const filter = { is_verified: false };
    if (cf != null) filter.college_id = cf;
    const notes = await Note.find(filter).sort({ created_at: -1 });
    const rows = await Promise.all(notes.map(enrichNote));
    res.json(rows);
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
      await Note.updateOne({ id: Number(noteId) }, { is_verified: true });
      const note = await Note.findOne({ id: Number(noteId) });
      if (note?.uploaded_by) {
        await User.findOneAndUpdate({ id: note.uploaded_by }, { $inc: { credits: 3 } });
        await Transaction.create({
          user_id: note.uploaded_by,
          credits_added: 3,
          reason: 'Note verified by admin'
        });
      }
      res.json({ message: 'Note approved.' });
    } else {
      await Note.deleteOne({ id: Number(noteId) });
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
    await Note.deleteOne({ id: Number(noteId) });
    res.json({ message: 'Note deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.createDegree = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required.' });
    const cid = targetCollegeIdForWrites(req);
    const degree = await Degree.create({ name: String(name).trim(), college_id: cid });
    res.status(201).json(leanDoc(degree));
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.createBranch = async (req, res) => {
  try {
    const { name, degreeId } = req.body;
    if (!name || degreeId == null) {
      return res.status(400).json({ error: 'name and degreeId are required.' });
    }
    const cid = targetCollegeIdForWrites(req);
    const degree = await Degree.findOne({ id: Number(degreeId) });
    if (!degree || degree.college_id !== cid) {
      return res.status(400).json({ error: 'Invalid degree for this college.' });
    }
    const branch = await Branch.create({
      name: String(name).trim(),
      degree_id: Number(degreeId),
      college_id: cid
    });
    res.status(201).json(leanDoc(branch));
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.createSemester = async (req, res) => {
  try {
    const { number, branchId } = req.body;
    if (number == null || branchId == null) {
      return res.status(400).json({ error: 'number and branchId are required.' });
    }
    const cid = targetCollegeIdForWrites(req);
    const branch = await Branch.findOne({ id: Number(branchId) });
    if (!branch || branch.college_id !== cid) {
      return res.status(400).json({ error: 'Invalid branch for this college.' });
    }
    const semester = await Semester.create({
      number,
      branch_id: Number(branchId),
      college_id: cid
    });
    res.status(201).json(leanDoc(semester));
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.createSubject = async (req, res) => {
  try {
    const { name, semesterId } = req.body;
    if (!name || semesterId == null) {
      return res.status(400).json({ error: 'name and semesterId are required.' });
    }
    const cid = targetCollegeIdForWrites(req);
    const semester = await Semester.findOne({ id: Number(semesterId) });
    if (!semester || semester.college_id !== cid) {
      return res.status(400).json({ error: 'Invalid semester for this college.' });
    }
    const subject = await Subject.create({
      name: String(name).trim(),
      semester_id: Number(semesterId),
      college_id: cid
    });
    res.status(201).json(leanDoc(subject));
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.createTopic = async (req, res) => {
  try {
    const { name, subjectId, parentTopicId, teacherId } = req.body;
    if (!name || subjectId == null) {
      return res.status(400).json({ error: 'name and subjectId are required.' });
    }
    const cid = targetCollegeIdForWrites(req);
    const subject = await Subject.findOne({ id: Number(subjectId) });
    if (!subject || subject.college_id !== cid) {
      return res.status(400).json({ error: 'Invalid subject for this college.' });
    }
    if (teacherId != null) {
      const te = await Teacher.findOne({ id: Number(teacherId) });
      if (
        !te ||
        te.college_id !== cid ||
        (te.subject_id != null && te.subject_id !== parseInt(subjectId, 10))
      ) {
        return res.status(400).json({ error: 'Invalid teacher for this subject/college.' });
      }
    }
    const topic = await Topic.create({
      name: String(name).trim(),
      subject_id: Number(subjectId),
      parent_topic_id: parentTopicId || null,
      teacher_id: teacherId || null,
      college_id: cid
    });
    res.status(201).json(leanDoc(topic));
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getAllNotes = async (req, res) => {
  try {
    const cf = resolveNotesCollegeFilter(req);
    const filter = cf == null ? {} : { college_id: cf };
    const notes = await Note.find(filter).sort({ created_at: -1 });
    const rows = await Promise.all(notes.map(enrichNote));
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const cf = resolveNotesCollegeFilter(req);
    const filter = cf == null ? {} : { college_id: cf };
    const [totalUsers, totalNotes, totalTopics, pendingNotes] = await Promise.all([
      User.countDocuments(filter),
      Note.countDocuments(filter),
      Topic.countDocuments(filter),
      Note.countDocuments({ ...filter, is_verified: false })
    ]);
    res.json({ totalUsers, totalNotes, totalTopics, pendingNotes });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getChartStats = async (req, res) => {
  try {
    const cf = resolveNotesCollegeFilter(req);
    const filter = cf == null ? {} : { college_id: cf };
    const [uploadsRes, usersRes] = await Promise.all([
      aggregateByDay(Note, filter),
      aggregateByDay(User, filter)
    ]);
    res.json({
      uploadsData: uploadsRes.map((r) => ({ date: r.date, uploads: r.count })),
      usersData: usersRes.map((r) => ({ date: r.date, users: r.count }))
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
    let tagsData = tags;
    if (!tagsData) tagsData = [];
    let credits = parseInt(bounty_credits, 10);
    if (isNaN(credits)) credits = 5;

    const challenge = await CompanyChallenge.create({
      company_name,
      title,
      description,
      difficulty,
      bounty_credits: credits,
      tags: tagsData
    });
    res.status(201).json(leanDoc(challenge));
  } catch (error) {
    console.error('createChallenge error:', error);
    res.status(500).json({ error: 'Server error creating company challenge.' });
  }
};

exports.updateChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_name, title, description, difficulty, bounty_credits, tags } = req.body;

    const challenge = await CompanyChallenge.findOne({ id: Number(id) });
    if (!challenge) return res.status(404).json({ error: 'Challenge not found.' });

    if (company_name != null) challenge.company_name = company_name;
    if (title != null) challenge.title = title;
    if (description != null) challenge.description = description;
    if (difficulty != null) challenge.difficulty = difficulty;
    if (bounty_credits != null) {
      const credits = parseInt(bounty_credits, 10);
      if (!isNaN(credits)) challenge.bounty_credits = credits;
    }
    if (tags != null) challenge.tags = tags;
    await challenge.save();
    res.json(leanDoc(challenge));
  } catch (err) {
    console.error('updateChallenge error:', err);
    res.status(500).json({ error: 'Server error updating challenge.' });
  }
};

exports.deleteChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    await ChallengeSubmission.deleteMany({ challenge_id: Number(id) });
    const del = await CompanyChallenge.findOneAndDelete({ id: Number(id) });
    if (!del) return res.status(404).json({ error: 'Challenge not found.' });
    res.json({ message: 'Challenge deleted successfully.' });
  } catch (err) {
    console.error('deleteChallenge error:', err);
    res.status(500).json({ error: 'Server error deleting challenge.' });
  }
};
