require('dotenv').config();
const connectDB = require('../config/db');
const { seed } = require('./seed');

async function main() {
  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) {
    console.error('Missing MONGODB_URI in environment.');
    process.exit(1);
  }

  try {
    await connectDB();
    console.log('DB init: seeding MongoDB collections...');
    await seed();
    console.log('DB init complete.');
    process.exit(0);
  } catch (err) {
    console.error('DB init failed.');
    console.error(err);
    process.exit(1);
  }
}

main();
