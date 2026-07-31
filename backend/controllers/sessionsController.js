const { StudySession } = require('../models');
const { leanDoc } = require('../utils/mongoHelpers');

function safeJson(value) {
  if (value == null) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

exports.listSessions = async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const status = req.query.status ? String(req.query.status) : null;
    const from = req.query.from ? new Date(String(req.query.from)) : null;
    const to = req.query.to ? new Date(String(req.query.to)) : null;

    const filter = { user_id: req.user.id };
    if (status) filter.status = status;
    if (from && !Number.isNaN(from.getTime())) filter.starts_at = { ...filter.starts_at, $gte: from };
    if (to && !Number.isNaN(to.getTime())) {
      filter.starts_at = { ...(filter.starts_at || {}), $lte: to };
    }

    const sessions = await StudySession.find(filter).sort({ starts_at: 1 }).limit(limit);
    res.json(sessions.map((r) => ({ ...leanDoc(r), meta: safeJson(r.meta) })));
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getSession = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid session id.' });

    const row = await StudySession.findOne({ id, user_id: req.user.id });
    if (!row) return res.status(404).json({ error: 'Session not found.' });
    res.json({ ...leanDoc(row), meta: safeJson(row.meta) });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.createSession = async (req, res) => {
  try {
    const { title, description = null, starts_at, ends_at = null, status = 'scheduled', meta = {} } = req.body || {};
    if (!title || !starts_at) return res.status(400).json({ error: 'title and starts_at are required.' });

    const row = await StudySession.create({
      user_id: req.user.id,
      title: String(title),
      description,
      starts_at: new Date(starts_at),
      ends_at: ends_at ? new Date(ends_at) : null,
      status: String(status),
      meta
    });

    res.status(201).json({ ...leanDoc(row), meta: safeJson(row.meta) });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.updateSession = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid session id.' });

    const { title, description, starts_at, ends_at, status, meta } = req.body || {};
    const row = await StudySession.findOne({ id, user_id: req.user.id });
    if (!row) return res.status(404).json({ error: 'Session not found.' });

    if (title != null) row.title = String(title);
    if (description != null) row.description = String(description);
    if (starts_at != null) row.starts_at = new Date(starts_at);
    if (ends_at != null) row.ends_at = new Date(ends_at);
    if (status != null) row.status = String(status);
    if (meta != null) row.meta = meta;
    row.updated_at = new Date();
    await row.save();

    res.json({ ...leanDoc(row), meta: safeJson(row.meta) });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.deleteSession = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid session id.' });

    const del = await StudySession.findOneAndDelete({ id, user_id: req.user.id });
    if (!del) return res.status(404).json({ error: 'Session not found.' });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};
