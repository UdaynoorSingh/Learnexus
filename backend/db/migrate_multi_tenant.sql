-- Multi-tenant upgrade for existing Learnexus databases created from the pre-tenant schema.
-- Backup your database before running. For new installs, use schema.sql + seed.sql only.
-- Adjust domain_suffix values if your seed colleges differ.

-- 1) Colleges
CREATE TABLE IF NOT EXISTS colleges (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain_suffix VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_colleges_domain_suffix_lower ON colleges (LOWER(domain_suffix));

INSERT INTO colleges (name, domain_suffix)
SELECT v.name, v.domain_suffix
FROM (VALUES
  ('Learnexus System', 'system.learnexus.internal'),
  ('Demo University', 'demo.edu'),
  ('Learnexus Platform', 'learnexus.com')
) AS v(name, domain_suffix)
WHERE NOT EXISTS (SELECT 1 FROM colleges c WHERE LOWER(c.domain_suffix) = LOWER(v.domain_suffix));

-- 2) Users: college, OTP fields, optional password (admin /admin login)
ALTER TABLE users ADD COLUMN IF NOT EXISTS college_id INTEGER REFERENCES colleges(id);
UPDATE users SET college_id = (SELECT id FROM colleges WHERE LOWER(domain_suffix) = 'demo.edu' LIMIT 1)
WHERE college_id IS NULL;
ALTER TABLE users ALTER COLUMN college_id SET NOT NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMPTZ;

-- Nullable password: only admin/superadmin use /api/auth/admin-login; students use OTP only.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);

DROP INDEX IF EXISTS idx_users_email_lower;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));

-- Re-home seeded system users if present
UPDATE users SET college_id = (SELECT id FROM colleges WHERE LOWER(domain_suffix) = 'learnexus.com' LIMIT 1)
WHERE LOWER(email) = LOWER('admin@learnexus.com');
UPDATE users SET college_id = (SELECT id FROM colleges WHERE LOWER(domain_suffix) = 'system.learnexus.internal' LIMIT 1)
WHERE LOWER(email) = LOWER('nexus-ai-tutor@system.learnexus.internal');

-- 3) Degrees
ALTER TABLE degrees ADD COLUMN IF NOT EXISTS college_id INTEGER REFERENCES colleges(id);
UPDATE degrees SET college_id = (SELECT id FROM colleges WHERE LOWER(domain_suffix) = 'demo.edu' LIMIT 1) WHERE college_id IS NULL;
ALTER TABLE degrees ALTER COLUMN college_id SET NOT NULL;
ALTER TABLE degrees DROP CONSTRAINT IF EXISTS degrees_name_key;
ALTER TABLE degrees ADD CONSTRAINT degrees_college_name_unique UNIQUE (college_id, name);

-- 4) Branches
ALTER TABLE branches ADD COLUMN IF NOT EXISTS college_id INTEGER REFERENCES colleges(id);
UPDATE branches b SET college_id = d.college_id FROM degrees d WHERE d.id = b.degree_id AND b.college_id IS NULL;
ALTER TABLE branches ALTER COLUMN college_id SET NOT NULL;
ALTER TABLE branches DROP CONSTRAINT IF EXISTS branches_degree_id_name_key;
ALTER TABLE branches ADD CONSTRAINT branches_degree_name_unique UNIQUE (degree_id, name);

-- 5) Semesters
ALTER TABLE semesters ADD COLUMN IF NOT EXISTS college_id INTEGER REFERENCES colleges(id);
UPDATE semesters s SET college_id = b.college_id FROM branches b WHERE b.id = s.branch_id AND s.college_id IS NULL;
ALTER TABLE semesters ALTER COLUMN college_id SET NOT NULL;
ALTER TABLE semesters DROP CONSTRAINT IF EXISTS semesters_branch_id_number_key;
ALTER TABLE semesters ADD CONSTRAINT semesters_branch_number_unique UNIQUE (branch_id, number);

-- 6) Subjects
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS college_id INTEGER REFERENCES colleges(id);
UPDATE subjects sub SET college_id = s.college_id FROM semesters s WHERE s.id = sub.semester_id AND sub.college_id IS NULL;
ALTER TABLE subjects ALTER COLUMN college_id SET NOT NULL;

-- 7) Teachers
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS college_id INTEGER REFERENCES colleges(id);
UPDATE teachers te SET college_id = sub.college_id FROM subjects sub WHERE sub.id = te.subject_id AND te.subject_id IS NOT NULL AND te.college_id IS NULL;
UPDATE teachers SET college_id = (SELECT id FROM colleges WHERE LOWER(domain_suffix) = 'demo.edu' LIMIT 1) WHERE college_id IS NULL;
ALTER TABLE teachers ALTER COLUMN college_id SET NOT NULL;

-- 8) Topics
ALTER TABLE topics ADD COLUMN IF NOT EXISTS college_id INTEGER REFERENCES colleges(id);
UPDATE topics t SET college_id = sub.college_id FROM subjects sub WHERE sub.id = t.subject_id AND t.college_id IS NULL;
ALTER TABLE topics ALTER COLUMN college_id SET NOT NULL;

-- 9) Notes
ALTER TABLE notes ADD COLUMN IF NOT EXISTS college_id INTEGER REFERENCES colleges(id);
UPDATE notes n SET college_id = t.college_id FROM topics t WHERE t.id = n.topic_id AND n.college_id IS NULL;
UPDATE notes SET college_id = (SELECT id FROM colleges WHERE LOWER(domain_suffix) = 'demo.edu' LIMIT 1) WHERE college_id IS NULL;
ALTER TABLE notes ALTER COLUMN college_id SET NOT NULL;

-- 10) Posts (nullable = global)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS college_id INTEGER REFERENCES colleges(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_posts_college_id ON posts(college_id);

-- 11) Tags scoped + partial uniques
ALTER TABLE tags ADD COLUMN IF NOT EXISTS college_id INTEGER REFERENCES colleges(id) ON DELETE CASCADE;
ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS tags_unique_global ON tags (name) WHERE college_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS tags_unique_college ON tags (college_id, name) WHERE college_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tags_college ON tags(college_id);

-- 12) Drop old trending view (controller queries tags with scope)
DROP VIEW IF EXISTS trending_rooms;

-- 13) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_degrees_college ON degrees(college_id);
CREATE INDEX IF NOT EXISTS idx_branches_college ON branches(college_id);
CREATE INDEX IF NOT EXISTS idx_semesters_college ON semesters(college_id);
CREATE INDEX IF NOT EXISTS idx_subjects_college ON subjects(college_id);
CREATE INDEX IF NOT EXISTS idx_topics_college ON topics(college_id);
CREATE INDEX IF NOT EXISTS idx_notes_college ON notes(college_id);
CREATE INDEX IF NOT EXISTS idx_users_college ON users(college_id);
