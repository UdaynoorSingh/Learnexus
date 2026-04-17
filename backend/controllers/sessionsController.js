const pool = require('../config/db');

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

    const params = [req.user.id];
    const where = ['user_id = $1'];
    if (status) {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
    if (from && !Number.isNaN(from.getTime())) {
      params.push(from.toISOString());
      where.push(`starts_at >= $${params.length}`);
    }
    if (to && !Number.isNaN(to.getTime())) {
      params.push(to.toISOString());
      where.push(`starts_at <= $${params.length}`);
    }
    params.push(limit);

    const q = `SELECT id, title, description, starts_at, ends_at, status, meta, created_at, updated_at
               FROM study_sessions
               WHERE ${where.join(' AND ')}
               ORDER BY starts_at ASC
               LIMIT $${params.length}`;

    const result = await pool.query(q, params);
    res.json(result.rows.map((r) => ({ ...r, meta: safeJson(r.meta) })));
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getSession = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid session id.' });

    const result = await pool.query(
      `SELECT id, title, description, starts_at, ends_at, status, meta, created_at, updated_at
       FROM study_sessions
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Session not found.' });
    const row = result.rows[0];
    res.json({ ...row, meta: safeJson(row.meta) });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.createSession = async (req, res) => {
  try {
    const { title, description = null, starts_at, ends_at = null, status = 'scheduled', meta = {} } = req.body || {};
    if (!title || !starts_at) return res.status(400).json({ error: 'title and starts_at are required.' });

    const result = await pool.query(
      `INSERT INTO study_sessions (user_id, title, description, starts_at, ends_at, status, meta)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, title, description, starts_at, ends_at, status, meta, created_at, updated_at`,
      [req.user.id, String(title), description, starts_at, ends_at, String(status), meta]
    );

    const row = result.rows[0];
    res.status(201).json({ ...row, meta: safeJson(row.meta) });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.updateSession = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid session id.' });

    const { title, description, starts_at, ends_at, status, meta } = req.body || {};

    const result = await pool.query(
      `UPDATE study_sessions
       SET title = COALESCE($3, title),
           description = COALESCE($4, description),
           starts_at = COALESCE($5, starts_at),
           ends_at = COALESCE($6, ends_at),
           status = COALESCE($7, status),
           meta = COALESCE($8, meta),
           updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id, title, description, starts_at, ends_at, status, meta, created_at, updated_at`,
      [
        id,
        req.user.id,
        title != null ? String(title) : null,
        description != null ? String(description) : null,
        starts_at ?? null,
        ends_at ?? null,
        status != null ? String(status) : null,
        meta ?? null
      ]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Session not found.' });
    const row = result.rows[0];
    res.json({ ...row, meta: safeJson(row.meta) });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.deleteSession = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid session id.' });

    const del = await pool.query('DELETE FROM study_sessions WHERE id = $1 AND user_id = $2 RETURNING id', [
      id,
      req.user.id
    ]);

    if (del.rows.length === 0) return res.status(404).json({ error: 'Session not found.' });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

