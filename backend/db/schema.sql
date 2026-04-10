



CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'admin', 'superadmin')),
  credits INTEGER DEFAULT 10,
  created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS degrees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS branches (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  degree_id INTEGER REFERENCES degrees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS semesters (
  id SERIAL PRIMARY KEY,
  number INTEGER NOT NULL,
  branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  semester_id INTEGER REFERENCES semesters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS teachers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS topics (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  parent_topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
  uploaded_by INTEGER REFERENCES users(id),
  file_url TEXT NOT NULL,
  extracted_text TEXT,
  summary TEXT,
  key_points JSONB,
  quality_score INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS topic_relations (
  id SERIAL PRIMARY KEY,
  topic_id_1 INTEGER REFERENCES topics(id) ON DELETE CASCADE,
  topic_id_2 INTEGER REFERENCES topics(id) ON DELETE CASCADE,
  relation_type VARCHAR(100)
);


CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  credits_added INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS idx_branches_degree ON branches(degree_id);
CREATE INDEX IF NOT EXISTS idx_semesters_branch ON semesters(branch_id);
CREATE INDEX IF NOT EXISTS idx_subjects_semester ON subjects(semester_id);
CREATE INDEX IF NOT EXISTS idx_topics_subject ON topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_topics_parent ON topics(parent_topic_id);
CREATE INDEX IF NOT EXISTS idx_notes_topic ON notes(topic_id);
CREATE INDEX IF NOT EXISTS idx_notes_uploaded_by ON notes(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
