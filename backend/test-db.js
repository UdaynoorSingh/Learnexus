require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT current_database(), current_schema();')
  .then(res => { console.log(res.rows[0]); process.exit(0); });
