require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function shouldUseRelaxedSsl(connectionString) {
  try {
    const u = new URL(connectionString);
    const host = (u.hostname || '').toLowerCase();
    return host.endsWith('.supabase.com') || host.includes('pooler.supabase.com');
  } catch {
    return false;
  }
}

function readSql(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Missing DATABASE_URL in environment.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: shouldUseRelaxedSsl(connectionString) ? { rejectUnauthorized: false } : undefined
  });

  const dbDir = path.join(__dirname, '..', 'db');
  const schemaFile = path.join(dbDir, 'schema.sql');
  const seedFile = path.join(dbDir, 'seed.sql');

  const migrationFiles = fs
    .readdirSync(dbDir)
    .filter((f) => /^migrate_.*\.sql$/i.test(f))
    .sort((a, b) => a.localeCompare(b))
    .map((f) => path.join(dbDir, f));

  const steps = [schemaFile, ...migrationFiles, seedFile];

  try {
    console.log(`DB init: applying ${steps.length} SQL file(s).`);
    for (const file of steps) {
      const sql = readSql(file);
      if (!sql.trim()) continue;
      console.log(`-> ${path.relative(process.cwd(), file)}`);
      await pool.query(sql);
    }

    console.log('DB init complete.');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('DB init failed.');
    console.error(err);
    try {
      await pool.end();
    } catch {
    }
    process.exit(1);
  }
}

main();

