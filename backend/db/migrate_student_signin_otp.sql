CREATE TABLE IF NOT EXISTS student_signin_otps (
  id SERIAL PRIMARY KEY,
  email VARCHAR(320) NOT NULL,
  name VARCHAR(255) NOT NULL,
  college_id INTEGER NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  otp_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_signin_otps_email_lower ON student_signin_otps (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_student_signin_otps_expires ON student_signin_otps (expires_at);
