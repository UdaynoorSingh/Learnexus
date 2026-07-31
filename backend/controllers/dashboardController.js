const {
  UserPin,
  StudySession,
  UserEvent,
  ConceptGraphCache,
  TutorState
} = require('../models');
const { leanDoc, leanDocs } = require('../utils/mongoHelpers');

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
    const now = new Date();

    const [pins, sessions, events] = await Promise.all([
      UserPin.find({ user_id: userId }).sort({ position: 1, id: 1 }),
      StudySession.find({
        user_id: userId,
        status: 'scheduled',
        starts_at: { $gte: now }
      })
        .sort({ starts_at: 1 })
        .limit(5),
      UserEvent.find({ user_id: userId }).sort({ occurred_at: -1 }).limit(20)
    ]);

    res.json({
      pins: leanDocs(pins),
      upcomingSessions: sessions.map((r) => ({ ...leanDoc(r), meta: safeJson(r.meta) })),
      events: events.map((r) => ({ ...leanDoc(r), payload: safeJson(r.payload) }))
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

    const filter = { user_id: userId };
    if (topicId == null) {
      filter.$or = [{ topic_id: null }, { topic_id: { $exists: false } }];
    } else {
      filter.topic_id = topicId;
    }

    const row = await ConceptGraphCache.findOne(filter).sort({ updated_at: -1 });
    if (row) {
      const ageMs = Date.now() - new Date(row.updated_at).getTime();
      if (Number.isFinite(ageMs) && ageMs < 24 * 60 * 60 * 1000) {
        return res.json({ sourceHash: row.source_hash, graph: safeJson(row.graph), cached: true });
      }
    }

    const response = await fetch(`${AI_BACKEND_URL}/api/ai/concept-graph`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId: topicId ?? undefined, contextMode: 'both' })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({ error: `AI Backend Error: ${errorText}` });
    }

    const data = await response.json();
    const sourceHash = String(data.sourceHash || 'unknown');
    const graph = data.graph || { nodes: [], edges: [] };

    const existing = await ConceptGraphCache.findOne({
      user_id: userId,
      topic_id: topicId,
      source_hash: sourceHash
    });
    if (existing) {
      existing.graph = graph;
      existing.updated_at = new Date();
      await existing.save();
    } else {
      await ConceptGraphCache.create({
        user_id: userId,
        topic_id: topicId,
        source_hash: sourceHash,
        graph
      });
    }

    res.json({ sourceHash, graph, cached: false });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.listPins = async (req, res) => {
  try {
    const pins = await UserPin.find({ user_id: req.user.id }).sort({ position: 1, id: 1 });
    res.json(leanDocs(pins));
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

    const maxPin = await UserPin.findOne({ user_id: userId }).sort({ position: -1 });
    const nextPos = (maxPin?.position ?? -1) + 1;
    const finalPos = Number.isFinite(Number(position)) ? Number(position) : nextPos;

    const pin = await UserPin.create({
      user_id: userId,
      kind: String(kind || 'route'),
      label: String(label),
      href: String(href),
      icon,
      color,
      position: finalPos
    });
    res.status(201).json(leanDoc(pin));
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
    const pin = await UserPin.findOne({ id: pinId, user_id: userId });
    if (!pin) return res.status(404).json({ error: 'Pin not found.' });

    if (kind != null) pin.kind = String(kind);
    if (label != null) pin.label = String(label);
    if (href != null) pin.href = String(href);
    if (icon != null) pin.icon = String(icon);
    if (color != null) pin.color = String(color);
    if (position != null && Number.isFinite(Number(position))) pin.position = Number(position);
    pin.updated_at = new Date();
    await pin.save();

    res.json(leanDoc(pin));
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.deletePin = async (req, res) => {
  try {
    const userId = req.user.id;
    const pinId = Number(req.params.id);
    if (!Number.isFinite(pinId)) return res.status(400).json({ error: 'Invalid pin id.' });

    const del = await UserPin.findOneAndDelete({ id: pinId, user_id: userId });
    if (!del) return res.status(404).json({ error: 'Pin not found.' });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.listEvents = async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const events = await UserEvent.find({ user_id: req.user.id })
      .sort({ occurred_at: -1 })
      .limit(limit);
    res.json(events.map((r) => ({ ...leanDoc(r), payload: safeJson(r.payload) })));
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { event_type, payload = {}, occurred_at = null } = req.body || {};
    if (!event_type) return res.status(400).json({ error: 'event_type is required.' });

    const event = await UserEvent.create({
      user_id: userId,
      event_type: String(event_type),
      payload,
      occurred_at: occurred_at ? new Date(occurred_at) : new Date()
    });

    res.status(201).json({ ...leanDoc(event), payload: safeJson(event.payload) });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getTutorState = async (req, res) => {
  try {
    const row = await TutorState.findOne({ user_id: req.user.id });
    if (!row) return res.json({ state: null });
    res.json({ state: safeJson(row.state), updated_at: row.updated_at });
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

    const row = await TutorState.findOneAndUpdate(
      { user_id: req.user.id },
      { state, updated_at: new Date() },
      { upsert: true, new: true }
    );
    res.json({ state: safeJson(row.state), updated_at: row.updated_at });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};
