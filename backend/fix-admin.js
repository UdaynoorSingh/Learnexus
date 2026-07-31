const bcrypt = require('bcryptjs');
require('dotenv').config();
const connectDB = require('./config/db');
const { College, User } = require('./models');

async function fix() {
  try {
    await connectDB();
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin123', salt);
    const college = await College.findOne({ domain_suffix: 'learnexus.com' });
    if (!college) {
      console.error('Missing learnexus.com college.');
      process.exit(1);
    }
    const user = await User.findOne({ email: 'admin@learnexus.com' });
    if (!user) {
      console.error('Admin user not found.');
      process.exit(1);
    }
    user.role = 'superadmin';
    user.college_id = college.id;
    user.is_verified = true;
    user.password = hash;
    await user.save();
    console.log('Admin updated: sign in at /admin with admin@learnexus.com / admin123');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

fix();
