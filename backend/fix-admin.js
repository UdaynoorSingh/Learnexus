const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

async function fix() {
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin123', salt);
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query("UPDATE users SET password = $1 WHERE email = 'admin@learnexus.com'", [hash]);
    console.log("Admin password updated successfully to 'admin123'!");
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
fix();
