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

CREATE TABLE IF NOT EXISTS library_post_votes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id INTEGER NOT NULL REFERENCES library_posts(id) ON DELETE CASCADE,
  vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('like', 'dislike')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_library_post_votes_post_vote ON library_post_votes(post_id, vote_type);
CREATE INDEX IF NOT EXISTS idx_library_post_votes_user ON library_post_votes(user_id);
