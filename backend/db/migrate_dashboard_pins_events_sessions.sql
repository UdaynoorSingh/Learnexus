-- Migration: Dashboard pins, events, sessions, concept-graph cache
-- Run: psql -U postgres -d learnexus -f backend/db/migrate_dashboard_pins_events_sessions.sql

-- 1) User pins (Dashboard quick actions, pinned tools, etc.)
CREATE TABLE IF NOT EXISTS user_pins (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Free-form "kind" to support different pinned entities (route, topic, note, external link, etc.)
  kind VARCHAR(40) NOT NULL DEFAULT 'route',
  label VARCHAR(120) NOT NULL,
  href TEXT NOT NULL,
  icon VARCHAR(80),
  color VARCHAR(40),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_pins_user ON user_pins(user_id);
CREATE INDEX IF NOT EXISTS idx_user_pins_user_position ON user_pins(user_id, position);

-- 2) Dashboard events (timeline / recent activity beyond notes)
CREATE TABLE IF NOT EXISTS user_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(60) NOT NULL,
  -- JSON payload for event-specific fields (e.g. {noteId, title}, {topicId}, {videoId})
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_events_user_time ON user_events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_type ON user_events(event_type);

-- 3) Study sessions (upcoming schedule items shown on Dashboard + iCal feed later)
CREATE TABLE IF NOT EXISTS study_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'done', 'cancelled')),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_start ON study_sessions(user_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_status ON study_sessions(user_id, status);

-- 4) AI Tutor saved state (lightweight persistence for roadmap/course state)
CREATE TABLE IF NOT EXISTS tutor_state (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4) Concept graph cache (feeds 3D knowledge graph widget; computed by AI backend)
CREATE TABLE IF NOT EXISTS concept_graph_cache (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Optional scope: topic graph vs global user graph
  topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
  -- Used to invalidate caches when sources change (e.g. notes/youtube chunk ids)
  source_hash VARCHAR(128) NOT NULL,
  graph JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, topic_id, source_hash)
);

CREATE INDEX IF NOT EXISTS idx_concept_graph_cache_user ON concept_graph_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_concept_graph_cache_user_topic ON concept_graph_cache(user_id, topic_id);

