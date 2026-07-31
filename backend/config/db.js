const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI =
  process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/learnexus';

let connected = false;

async function connectDB() {
  if (connected) return mongoose.connection;
  mongoose.set('strictQuery', true);
  await mongoose.connect(MONGODB_URI);
  connected = true;
  console.log('Connected to MongoDB');
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });
  return mongoose.connection;
}

module.exports = connectDB;
module.exports.mongoose = mongoose;
