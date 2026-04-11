const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { emailHostMatchesDomainSuffix } = require('../utils/collegeDomain');

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

/**
 * Student sign-in: if the email host matches a registered college domain, create/update the user
 * and issue a JWT (no email / OTP).
 */
exports.studentEmailLogin = async (req, res) => {
  const rawEmail = req.body?.email;
  const rawName = req.body?.name;
  if (!rawEmail || typeof rawEmail !== 'string' || !rawEmail.includes('@')) {
    return res.status(400).json({ error: 'A valid university email is required.' });
  }
  const nameTrim = String(rawName || '').trim();
  if (!nameTrim) {
    return res.status(400).json({ error: 'Name is required.' });
  }

  const emailNorm = rawEmail.trim().toLowerCase();
  const parts = emailNorm.split('@');
  if (parts.length !== 2 || !parts[1]) {
    return res.status(400).json({ error: 'A valid university email is required.' });
  }
  const emailHost = parts[1].trim().toLowerCase();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const collegesRes = await client.query('SELECT id, name, domain_suffix FROM colleges');
    const college = collegesRes.rows.find((c) =>
      emailHostMatchesDomainSuffix(emailHost, c.domain_suffix)
    );
    if (!college) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'College not supported.' });
    }

    const existing = await client.query(
      `SELECT id, role, college_id FROM users WHERE LOWER(email) = LOWER($1) FOR UPDATE`,
      [emailNorm]
    );
    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      if (row.role === 'admin' || row.role === 'superadmin') {
        await client.query('ROLLBACK');
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
        [row.id, college.id, nameTrim.slice(0, 255)]
      );
    } else {
      await client.query(
        `INSERT INTO users (name, email, college_id, is_verified)
         VALUES ($1, $2, $3, true)`,
        [nameTrim.slice(0, 255), emailNorm, college.id]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('studentEmailLogin error:', error);
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
    console.error('studentEmailLogin load user error:', error);
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
