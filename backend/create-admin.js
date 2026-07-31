const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const { College, User } = require('./models');

const DEFAULT_PASSWORD = 'admin123';

async function createOrUpdateAdmin() {
  try {
    await connectDB();

    const college = await College.findOne({ domain_suffix: 'learnexus.com' });
    if (!college) {
      console.error('Missing learnexus.com college — run npm run db:init first.');
      process.exit(1);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, salt);

    const existing = await User.findOne({ email: 'admin@learnexus.com' });

    if (existing) {
      existing.role = 'superadmin';
      existing.college_id = college.id;
      existing.is_verified = true;
      existing.password = hashedPassword;
      await existing.save();
      console.log(`Admin updated. Sign in at http://localhost:5173/admin with admin@learnexus.com / ${DEFAULT_PASSWORD}`);
    } else {
      await User.create({
        name: 'Admin',
        email: 'admin@learnexus.com',
        college_id: college.id,
        role: 'superadmin',
        credits: 100,
        is_verified: true,
        password: hashedPassword
      });
      console.log(`Admin created. Sign in at http://localhost:5173/admin with admin@learnexus.com / ${DEFAULT_PASSWORD}`);
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

createOrUpdateAdmin();
