const bcrypt = require('bcryptjs');
const pool = require('./config/db');

async function createOrUpdateAdmin() {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    const check = await pool.query('SELECT * FROM users WHERE email = $1', ['admin@learnexus.com']);
    
    if (check.rows.length > 0) {
      await pool.query('UPDATE users SET password = $1, role = $2 WHERE email = $3', [hashedPassword, 'superadmin', 'admin@learnexus.com']);
      console.log('✅ Admin password updated to "admin123" and role set to "superadmin".');
    } else {
      await pool.query(
        'INSERT INTO users (name, email, password, role, credits) VALUES ($1, $2, $3, $4, $5)',
        ['Admin', 'admin@learnexus.com', hashedPassword, 'superadmin', 100]
      );
      console.log('✅ Admin user created with email "admin@learnexus.com" and password "admin123".');
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

createOrUpdateAdmin();
