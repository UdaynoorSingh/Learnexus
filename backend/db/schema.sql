

CREATE TABLE IF NOT EXISTS colleges (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain_suffix VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_colleges_domain_suffix_lower ON colleges (LOWER(domain_suffix));


CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  college_id INTEGER NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
  role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'admin', 'superadmin')),
  credits INTEGER DEFAULT 10,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  otp_code VARCHAR(10),
  otp_expiry TIMESTAMPTZ,
  password VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));


CREATE TABLE IF NOT EXISTS degrees (
  id SERIAL PRIMARY KEY,
  college_id INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  UNIQUE (college_id, name)
);

CREATE TABLE IF NOT EXISTS branches (
  id SERIAL PRIMARY KEY,
  college_id INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  degree_id INTEGER REFERENCES degrees(id) ON DELETE CASCADE,
  UNIQUE (degree_id, name)
);

CREATE TABLE IF NOT EXISTS semesters (
  id SERIAL PRIMARY KEY,
  college_id INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
  UNIQUE (branch_id, number)
);

CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  college_id INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  semester_id INTEGER REFERENCES semesters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS teachers (
  id SERIAL PRIMARY KEY,
  college_id INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS topics (
  id SERIAL PRIMARY KEY,
  college_id INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  parent_topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  college_id INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
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


CREATE INDEX IF NOT EXISTS idx_degrees_college ON degrees(college_id);
CREATE INDEX IF NOT EXISTS idx_branches_degree ON branches(degree_id);
CREATE INDEX IF NOT EXISTS idx_branches_college ON branches(college_id);
CREATE INDEX IF NOT EXISTS idx_semesters_branch ON semesters(branch_id);
CREATE INDEX IF NOT EXISTS idx_semesters_college ON semesters(college_id);
CREATE INDEX IF NOT EXISTS idx_subjects_semester ON subjects(semester_id);
CREATE INDEX IF NOT EXISTS idx_subjects_college ON subjects(college_id);
CREATE INDEX IF NOT EXISTS idx_topics_subject ON topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_topics_parent ON topics(parent_topic_id);
CREATE INDEX IF NOT EXISTS idx_topics_college ON topics(college_id);
CREATE INDEX IF NOT EXISTS idx_notes_topic ON notes(topic_id);
CREATE INDEX IF NOT EXISTS idx_notes_uploaded_by ON notes(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_notes_college ON notes(college_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_users_college ON users(college_id);


CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  college_id INTEGER REFERENCES colleges(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  tag VARCHAR(100) NOT NULL,
  bounty INTEGER NOT NULL DEFAULT 0 CHECK (bounty >= 0),
  is_solved BOOLEAN NOT NULL DEFAULT FALSE,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  audio_url VARCHAR(512),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_accepted_answer BOOLEAN NOT NULL DEFAULT FALSE,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);

CREATE TABLE IF NOT EXISTS comment_upvotes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_upvotes_comment ON comment_upvotes(comment_id);

CREATE TABLE IF NOT EXISTS post_upvotes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_college_id ON posts(college_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_upvotes_post_id ON post_upvotes(post_id);

CREATE TABLE IF NOT EXISTS post_bookmarks (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_post_bookmarks_post_id ON post_bookmarks(post_id);

CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  college_id INTEGER REFERENCES colleges(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  post_count INTEGER NOT NULL DEFAULT 0,
  last_active TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS tags_unique_global ON tags (name) WHERE college_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS tags_unique_college ON tags (college_id, name) WHERE college_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tags_last_active ON tags(last_active DESC);
CREATE INDEX IF NOT EXISTS idx_tags_college ON tags(college_id);


CREATE TABLE IF NOT EXISTS library_posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  college_id INTEGER REFERENCES colleges(id) ON DELETE SET NULL,
  topic VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  content TEXT NOT NULL,
  difficulty VARCHAR(20) NOT NULL DEFAULT 'intermediate'
    CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  audio_url VARCHAR(512),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_library_posts_user ON library_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_library_posts_college ON library_posts(college_id);
CREATE INDEX IF NOT EXISTS idx_library_posts_created ON library_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_library_posts_difficulty ON library_posts(difficulty);
