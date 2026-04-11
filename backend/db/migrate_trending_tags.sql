CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  post_count INTEGER NOT NULL DEFAULT 0,
  last_active TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tags_last_active ON tags(last_active DESC);

CREATE OR REPLACE VIEW trending_rooms AS
SELECT name, post_count
FROM tags
WHERE post_count >= 3
ORDER BY last_active DESC NULLS LAST
LIMIT 15;
