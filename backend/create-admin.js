const bcrypt = require('bcryptjs');
const pool = require('./config/db');

const DEFAULT_PASSWORD = 'admin123';

async function createOrUpdateAdmin() {
  try {
    const collegeRes = await pool.query(
      `SELECT id FROM colleges WHERE LOWER(domain_suffix) = 'learnexus.com' LIMIT 1`
    );
    if (collegeRes.rows.length === 0) {
      console.error('Missing learnexus.com college — run schema.sql and seed.sql first.');
      process.exit(1);
    }
    const collegeId = collegeRes.rows[0].id;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, salt);

    const check = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [
      'admin@learnexus.com'
    ]);

    if (check.rows.length > 0) {
      await pool.query(
        `UPDATE users SET role = $1, college_id = $2, is_verified = true, password = $3
         WHERE LOWER(email) = LOWER($4)`,
        ['superadmin', collegeId, hashedPassword, 'admin@learnexus.com']
      );
      console.log(`Admin updated. Sign in at http://localhost:5173/admin with admin@learnexus.com / ${DEFAULT_PASSWORD}`);
    } else {
      await pool.query(
        `INSERT INTO users (name, email, college_id, role, credits, is_verified, password)
         VALUES ($1, $2, $3, $4, $5, true, $6)`,
        ['Admin', 'admin@learnexus.com', collegeId, 'superadmin', 100, hashedPassword]
      );
      console.log(`Admin created. Sign in at http://localhost:5173/admin with admin@learnexus.com / ${DEFAULT_PASSWORD}`);
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

createOrUpdateAdmin();
