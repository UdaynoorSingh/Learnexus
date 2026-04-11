const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

async function fix() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin123', salt);
    const collegeRes = await pool.query(
      `SELECT id FROM colleges WHERE LOWER(domain_suffix) = 'learnexus.com' LIMIT 1`
    );
    if (collegeRes.rows.length === 0) {
      console.error('Missing learnexus.com college.');
      process.exit(1);
    }
    await pool.query(
      `UPDATE users SET role = 'superadmin', college_id = $1, is_verified = true, password = $2
       WHERE LOWER(email) = LOWER('admin@learnexus.com')`,
      [collegeRes.rows[0].id, hash]
    );
    console.log("Admin updated: sign in at /admin with admin@learnexus.com / admin123");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fix();
