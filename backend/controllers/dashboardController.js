const pool = require('../config/db');

const AI_BACKEND_URL = process.env.AI_BACKEND_URL || 'http://localhost:5001';

function safeJson(value) {
  if (value == null) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

exports.getOverview = async (req, res) => {
  try {
    const userId = req.user.id;

    const [pinsRes, sessionsRes, eventsRes] = await Promise.all([
      pool.query(
        'SELECT id, kind, label, href, icon, color, position, created_at, updated_at FROM user_pins WHERE user_id = $1 ORDER BY position ASC, id ASC',
        [userId]
      ),
      pool.query(
        `SELECT id, title, description, starts_at, ends_at, status, meta, created_at, updated_at
         FROM study_sessions
         WHERE user_id = $1 AND status = 'scheduled' AND starts_at >= NOW()
         ORDER BY starts_at ASC
         LIMIT 5`,
        [userId]
      ),
      pool.query(
        'SELECT id, event_type, payload, occurred_at FROM user_events WHERE user_id = $1 ORDER BY occurred_at DESC LIMIT 20',
        [userId]
      )
    ]);

    const upcomingSessions = sessionsRes.rows.map((r) => ({ ...r, meta: safeJson(r.meta) }));
    const events = eventsRes.rows.map((r) => ({ ...r, payload: safeJson(r.payload) }));

    res.json({
      pins: pinsRes.rows,
      upcomingSessions,
      events
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getConceptGraph = async (req, res) => {
  try {
    const userId = req.user.id;
    const rawTopicId = req.query.topicId;
    const topicId =
      rawTopicId == null || String(rawTopicId).trim() === '' ? null : Number(String(rawTopicId));
    if (topicId != null && !Number.isFinite(topicId)) {
      return res.status(400).json({ error: 'Invalid topicId.' });
    }

    const cached = await pool.query(
      `SELECT id, source_hash, graph, updated_at
       FROM concept_graph_cache
       WHERE user_id = $1 AND (topic_id = $2 OR ($2 IS NULL AND topic_id IS NULL))
       ORDER BY updated_at DESC
       LIMIT 1`,
      [userId, topicId]
    );

    const row = cached.rows[0];
    if (row) {
      const ageMs = Date.now() - new Date(row.updated_at).getTime();
      if (Number.isFinite(ageMs) && ageMs < 24 * 60 * 60 * 1000) {
        return res.json({ sourceHash: row.source_hash, graph: safeJson(row.graph), cached: true });
      }
    }

    const response = await fetch(`${AI_BACKEND_URL}/api/ai/concept-graph`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topicId: topicId ?? undefined,
        contextMode: 'both'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({ error: `AI Backend Error: ${errorText}` });
    }

    const data = await response.json();
    const sourceHash = String(data.sourceHash || 'unknown');
    const graph = data.graph || { nodes: [], edges: [] };

    await pool.query(
      `INSERT INTO concept_graph_cache (user_id, topic_id, source_hash, graph)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, topic_id, source_hash)
       DO UPDATE SET graph = EXCLUDED.graph, updated_at = NOW()`,
      [userId, topicId, sourceHash, graph]
    );

    res.json({ sourceHash, graph, cached: false });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.listPins = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, kind, label, href, icon, color, position, created_at, updated_at FROM user_pins WHERE user_id = $1 ORDER BY position ASC, id ASC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.createPin = async (req, res) => {
  try {
    const userId = req.user.id;
    const { kind = 'route', label, href, icon = null, color = null, position = null } = req.body || {};
    if (!label || !href) {
      return res.status(400).json({ error: 'label and href are required.' });
    }

    const posRes = await pool.query(
      'SELECT COALESCE(MAX(position), -1) AS max_pos FROM user_pins WHERE user_id = $1',
      [userId]
    );
    const nextPos = Number(posRes.rows?.[0]?.max_pos ?? -1) + 1;
    const finalPos = Number.isFinite(Number(position)) ? Number(position) : nextPos;

    const insert = await pool.query(
      `INSERT INTO user_pins (user_id, kind, label, href, icon, color, position)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, kind, label, href, icon, color, position, created_at, updated_at`,
      [userId, String(kind || 'route'), String(label), String(href), icon, color, finalPos]
    );
    res.status(201).json(insert.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.updatePin = async (req, res) => {
  try {
    const userId = req.user.id;
    const pinId = Number(req.params.id);
    if (!Number.isFinite(pinId)) return res.status(400).json({ error: 'Invalid pin id.' });

    const { kind, label, href, icon, color, position } = req.body || {};

    const update = await pool.query(
      `UPDATE user_pins
       SET kind = COALESCE($3, kind),
           label = COALESCE($4, label),
           href = COALESCE($5, href),
           icon = COALESCE($6, icon),
           color = COALESCE($7, color),
           position = COALESCE($8, position),
           updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id, kind, label, href, icon, color, position, created_at, updated_at`,
      [
        pinId,
        userId,
        kind != null ? String(kind) : null,
        label != null ? String(label) : null,
        href != null ? String(href) : null,
        icon != null ? String(icon) : null,
        color != null ? String(color) : null,
        position != null && Number.isFinite(Number(position)) ? Number(position) : null
      ]
    );

    if (update.rows.length === 0) return res.status(404).json({ error: 'Pin not found.' });
    res.json(update.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.deletePin = async (req, res) => {
  try {
    const userId = req.user.id;
    const pinId = Number(req.params.id);
    if (!Number.isFinite(pinId)) return res.status(400).json({ error: 'Invalid pin id.' });

    const del = await pool.query('DELETE FROM user_pins WHERE id = $1 AND user_id = $2 RETURNING id', [
      pinId,
      userId
    ]);
    if (del.rows.length === 0) return res.status(404).json({ error: 'Pin not found.' });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.listEvents = async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const result = await pool.query(
      'SELECT id, event_type, payload, occurred_at FROM user_events WHERE user_id = $1 ORDER BY occurred_at DESC LIMIT $2',
      [req.user.id, limit]
    );
    res.json(result.rows.map((r) => ({ ...r, payload: safeJson(r.payload) })));
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { event_type, payload = {}, occurred_at = null } = req.body || {};
    if (!event_type) return res.status(400).json({ error: 'event_type is required.' });

    const result = await pool.query(
      `INSERT INTO user_events (user_id, event_type, payload, occurred_at)
       VALUES ($1, $2, $3, COALESCE($4, NOW()))
       RETURNING id, event_type, payload, occurred_at`,
      [userId, String(event_type), payload, occurred_at]
    );

    res.status(201).json({ ...result.rows[0], payload: safeJson(result.rows[0].payload) });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getTutorState = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT state, updated_at FROM tutor_state WHERE user_id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.json({ state: null });
    res.json({ state: safeJson(result.rows[0].state), updated_at: result.rows[0].updated_at });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.putTutorState = async (req, res) => {
  try {
    const state = req.body?.state ?? null;
    if (state == null || typeof state !== 'object') {
      return res.status(400).json({ error: 'state (object) is required.' });
    }

    const result = await pool.query(
      `INSERT INTO tutor_state (user_id, state)
       VALUES ($1, $2)
       ON CONFLICT (user_id)
       DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()
       RETURNING state, updated_at`,
      [req.user.id, state]
    );
    res.json({ state: safeJson(result.rows[0].state), updated_at: result.rows[0].updated_at });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

