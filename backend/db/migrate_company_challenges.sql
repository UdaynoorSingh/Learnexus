CREATE TABLE IF NOT EXISTS company_challenges (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  difficulty VARCHAR(20) NOT NULL DEFAULT 'Medium'
    CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  bounty_credits INTEGER NOT NULL DEFAULT 0,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challenge_submissions (
  id SERIAL PRIMARY KEY,
  challenge_id INTEGER NOT NULL REFERENCES company_challenges(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  github_url VARCHAR(1024) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Under Review', 'Accepted', 'Rejected')),
  submitted_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challenge_submissions_challenge ON challenge_submissions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_user ON challenge_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_company_challenges_created ON company_challenges(created_at DESC);

INSERT INTO company_challenges (company_name, title, description, difficulty, bounty_credits, tags) VALUES
(
  'Google',
  'Optimize Space/Time Complexity for Grid Puzzle',
  'Given an N×N grid where each cell contains a positive integer, find the path from the top-left to the bottom-right that minimizes the maximum cell value along the path. Your implementation must run in O(N² log N) time and O(N²) space. The current brute-force solution times out on grids larger than 500×500. Refactor the pathfinding logic using a binary search on the answer combined with BFS/DFS reachability checks. Include comprehensive edge-case handling for grids with uniform values, single-row/column grids, and grids where no valid path exists under the given constraints. Submit a well-documented C++ or Rust solution with benchmark results.',
  'Hard',
  500,
  '["C++", "Algorithms", "Graph Theory", "Binary Search", "BFS"]'::jsonb
),
(
  'Vercel',
  'Fix JWT Auth Race Condition in Edge Middleware',
  'Our Next.js edge middleware has a critical race condition: when two simultaneous requests arrive with a near-expired JWT, both trigger a token refresh. The second refresh invalidates the first new token, causing a cascade of 401 errors across the user session. Reproduce the bug using the provided test harness (k6 load test script included), identify the root cause in the token rotation logic, and implement a fix using either a distributed lock (Redis-based) or an idempotent refresh strategy. The solution must maintain sub-50ms p99 latency at the edge. Include a detailed write-up of the race condition timeline and your fix.',
  'Hard',
  350,
  '["Node.js", "JWT", "Edge Computing", "Concurrency", "Redis"]'::jsonb
),
(
  'Stripe',
  'Build a Real-Time Fraud Detection Sliding Window',
  'Implement a sliding-window rate limiter that can flag potentially fraudulent transaction patterns in real time. The system should track per-merchant transaction velocity, amount anomalies, and geographic dispersion over configurable time windows (1min, 5min, 1hr). The implementation must support at least 10,000 events/second on a single core, use no more than 50MB of memory, and produce alerts within 100ms of a suspicious pattern being detected. Use a lock-free ring buffer for event ingestion. Provide benchmarks using the included synthetic transaction dataset (1M events). Bonus: implement a simple ML scoring layer using pre-trained weights.',
  'Medium',
  250,
  '["Python", "Systems Design", "Concurrency", "Data Structures", "Fraud Detection"]'::jsonb
);
