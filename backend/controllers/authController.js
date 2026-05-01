const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { emailHostMatchesDomainSuffix } = require('../utils/collegeDomain');
const { sendOtpEmail } = require('../utils/mailer');
const { generateSixDigitCode, hashOtp, verifyOtp, normalizeEmail } = require('../utils/studentOtp');

const OTP_RESEND_COOLDOWN_MS = Math.max(
  15_000,
  parseInt(process.env.OTP_RESEND_COOLDOWN_SEC || '60', 10) * 1000
);
const OTP_EXPIRY_MINUTES = Math.min(
  15,
  Math.max(5, parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10))
);

const lastOtpSendAt = new Map();

function smtpOrDevOtpReady() {
  const user = (process.env.SMTP_USER || process.env.SMTP_EMAIL || '').trim();
  const pass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '').trim();
  const devConsole =
    process.env.NODE_ENV !== 'production' &&
    (process.env.DEV_OTP_TO_CONSOLE === 'true' || process.env.DEV_OTP_TO_CONSOLE === '1');
  return devConsole || (!!user && !!pass);
}

async function cleanupExpiredOtps(client) {
  await client.query(`DELETE FROM student_signin_otps WHERE expires_at < NOW()`);
}

function signToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      collegeId: user.college_id,
      isVerified: user.is_verified
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}


async function resolveStudentCollege(client, rawEmail) {
  const emailNorm = normalizeEmail(rawEmail);
  if (!emailNorm || !emailNorm.includes('@')) {
    return { error: { status: 400, body: { error: 'A valid university email is required.' } } };
  }
  const parts = emailNorm.split('@');
  if (parts.length !== 2 || !parts[1]) {
    return { error: { status: 400, body: { error: 'A valid university email is required.' } } };
  }
  const emailHost = parts[1].trim().toLowerCase();
  const collegesRes = await client.query('SELECT id, name, domain_suffix FROM colleges');
  const college = collegesRes.rows.find((c) =>
    emailHostMatchesDomainSuffix(emailHost, c.domain_suffix)
  );
  if (!college) {
    return { error: { status: 403, body: { error: 'College not supported.' } } };
  }
  return { college, emailNorm, emailHost };
}


exports.studentRequestOtp = async (req, res) => {
  if (!smtpOrDevOtpReady()) {
    return res.status(503).json({
      error:
        'Email is not configured. Set SMTP_EMAIL + SMTP_PASSWORD (Gmail app password) or DEV_OTP_TO_CONSOLE=true for local dev.'
    });
  }

  const rawEmail = req.body?.email;
  const nameTrim = String(req.body?.name || '').trim();
  if (!nameTrim) {
    return res.status(400).json({ error: 'Name is required.' });
  }

  const client = await pool.connect();
  try {
    const resolved = await resolveStudentCollege(client, rawEmail);
    if (resolved.error) {
      return res.status(resolved.error.status).json(resolved.error.body);
    }
    const { college, emailNorm } = resolved;

    const existing = await client.query(
      `SELECT id, role FROM users WHERE LOWER(email) = LOWER($1)`,
      [emailNorm]
    );
    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      if (row.role === 'admin' || row.role === 'superadmin') {
        return res.status(403).json({ error: 'Staff accounts must sign in from the admin page.' });
      }
    }

    const now = Date.now();
    const last = lastOtpSendAt.get(emailNorm) || 0;
    if (now - last < OTP_RESEND_COOLDOWN_MS) {
      return res.status(429).json({
        error: `Please wait ${Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - last)) / 1000)}s before requesting another code.`
      });
    }

    await cleanupExpiredOtps(client);
    await client.query(`DELETE FROM student_signin_otps WHERE LOWER(email) = LOWER($1)`, [emailNorm]);

    const code = generateSixDigitCode();
    const otpHash = hashOtp(emailNorm, code);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await client.query(
      `INSERT INTO student_signin_otps (email, name, college_id, otp_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [emailNorm, nameTrim.slice(0, 255), college.id, otpHash, expiresAt]
    );

    lastOtpSendAt.set(emailNorm, now);

    try {
      await sendOtpEmail(emailNorm, code, OTP_EXPIRY_MINUTES);
    } catch (mailErr) {
      console.error('sendOtpEmail error:', mailErr);
      await client.query(`DELETE FROM student_signin_otps WHERE LOWER(email) = LOWER($1)`, [emailNorm]);
      lastOtpSendAt.delete(emailNorm);
      return res.status(502).json({ error: 'Could not send email. Check SMTP settings.' });
    }

    return res.json({
      message: `Check your inbox for a ${OTP_EXPIRY_MINUTES}-minute code.`,
      expiresInMinutes: OTP_EXPIRY_MINUTES
    });
  } catch (error) {
    if (error.code === '42P01') {
      return res.status(500).json({
        error:
          'OTP table missing. Run backend/db/migrate_student_signin_otp.sql against your database.'
      });
    }
    console.error('studentRequestOtp error:', error);
    return res.status(500).json({ error: 'Server error.' });
  } finally {
    client.release();
  }
};


exports.studentVerifyOtp = async (req, res) => {
  const rawEmail = req.body?.email;
  const codeRaw = req.body?.code;
  const emailNorm = normalizeEmail(rawEmail);
  const code = String(codeRaw || '').replace(/\D/g, '');
  if (!emailNorm || !emailNorm.includes('@')) {
    return res.status(400).json({ error: 'A valid university email is required.' });
  }
  if (code.length !== 6) {
    return res.status(400).json({ error: 'Enter the 6-digit code from your email.' });
  }

  const client = await pool.connect();
  let tx = false;
  try {
    await cleanupExpiredOtps(client);

    const otpRes = await client.query(
      `SELECT id, email, name, college_id, otp_hash, expires_at
       FROM student_signin_otps
       WHERE LOWER(email) = LOWER($1) AND expires_at > NOW()
       ORDER BY id DESC
       LIMIT 1`,
      [emailNorm]
    );
    if (otpRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired code. Request a new one.' });
    }
    const otpRow = otpRes.rows[0];
    if (!verifyOtp(emailNorm, code, otpRow.otp_hash)) {
      return res.status(400).json({ error: 'Invalid code.' });
    }

    const collegeCheck = await resolveStudentCollege(client, emailNorm);
    if (collegeCheck.error) {
      return res.status(collegeCheck.error.status).json(collegeCheck.error.body);
    }
    if (collegeCheck.college.id !== otpRow.college_id) {
      return res.status(400).json({ error: 'College configuration changed. Request a new code.' });
    }

    const nameTrim = String(otpRow.name || '').trim().slice(0, 255);
    const college = collegeCheck.college;

    await client.query('BEGIN');
    tx = true;

    const existing = await client.query(
      `SELECT id, role, college_id FROM users WHERE LOWER(email) = LOWER($1) FOR UPDATE`,
      [emailNorm]
    );
    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      if (row.role === 'admin' || row.role === 'superadmin') {
        await client.query('ROLLBACK');
        tx = false;
        return res.status(403).json({ error: 'Staff accounts must sign in from the admin page.' });
      }
      await client.query(
        `UPDATE users SET
           college_id = $2,
           name = $3,
           is_verified = true,
           otp_code = NULL,
           otp_expiry = NULL
         WHERE id = $1`,
        [row.id, college.id, nameTrim]
      );
    } else {
      await client.query(
        `INSERT INTO users (name, email, college_id, is_verified)
         VALUES ($1, $2, $3, true)`,
        [nameTrim, emailNorm, college.id]
      );
    }

    await client.query(`DELETE FROM student_signin_otps WHERE LOWER(email) = LOWER($1)`, [emailNorm]);
    await client.query('COMMIT');
    tx = false;
  } catch (error) {
    if (tx) await client.query('ROLLBACK').catch(() => {});
    if (error.code === '42P01') {
      return res.status(500).json({
        error:
          'OTP table missing. Run backend/db/migrate_student_signin_otp.sql against your database.'
      });
    }
    console.error('studentVerifyOtp error:', error);
    return res.status(500).json({ error: 'Server error.' });
  } finally {
    client.release();
  }

  try {
    const refreshed = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.credits, u.college_id, u.is_verified, c.name AS college_name
       FROM users u
       LEFT JOIN colleges c ON c.id = u.college_id
       WHERE LOWER(u.email) = LOWER($1)`,
      [emailNorm]
    );
    const row = refreshed.rows[0];
    if (!row) {
      return res.status(500).json({ error: 'Server error.' });
    }
    const token = signToken(row);
    res.json({
      user: {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        credits: row.credits,
        college_id: row.college_id,
        college_name: row.college_name,
        is_verified: row.is_verified
      },
      token
    });
  } catch (error) {
    console.error('studentVerifyOtp load user error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const emailNorm = String(email).trim().toLowerCase();

    const r = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.credits, u.college_id, u.is_verified, u.password,
              c.name AS college_name
       FROM users u
       LEFT JOIN colleges c ON c.id = u.college_id
       WHERE LOWER(u.email) = LOWER($1)`,
      [emailNorm]
    );

    if (r.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const row = r.rows[0];
    if (row.role !== 'admin' && row.role !== 'superadmin') {
      return res.status(403).json({ error: 'This sign-in is only for staff accounts.' });
    }
    if (!row.password) {
      return res.status(403).json({
        error: 'Admin password is not set. Run node create-admin.js from the backend folder.'
      });
    }

    const match = await bcrypt.compare(String(password), row.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(row);
    res.json({
      user: {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        credits: row.credits,
        college_id: row.college_id,
        college_name: row.college_name,
        is_verified: row.is_verified
      },
      token
    });
  } catch (error) {
    console.error('adminLogin error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getMe = async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};
