const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { College, User, StudentSigninOtp } = require('../models');
const { leanDoc } = require('../utils/mongoHelpers');
const { emailHostMatchesDomainSuffix } = require('../utils/collegeDomain');
const { sendOtpEmail, isEmailConfigured } = require('../utils/mailer');
const { generateSixDigitCode, hashOtp, verifyOtp, normalizeEmail } = require('../utils/studentOtp');

const OTP_RESEND_COOLDOWN_MS = Math.max(
  15_000,
  parseInt(process.env.OTP_RESEND_COOLDOWN_SEC || '60', 10) * 1000
);
const OTP_EXPIRY_MINUTES = Math.min(
  15,
  Math.max(5, parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10))
);

const lastOtpSendAt = new Map();


async function cleanupExpiredOtps() {
  await StudentSigninOtp.deleteMany({ expires_at: { $lt: new Date() } });
}

function signToken(user) {
  return jwt.sign(
    { userId: user.id, collegeId: user.college_id, isVerified: user.is_verified },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

async function resolveStudentCollege(rawEmail) {
  const emailNorm = normalizeEmail(rawEmail);
  if (!emailNorm || !emailNorm.includes('@')) {
    return { error: { status: 400, body: { error: 'A valid university email is required.' } } };
  }
  const parts = emailNorm.split('@');
  if (parts.length !== 2 || !parts[1]) {
    return { error: { status: 400, body: { error: 'A valid university email is required.' } } };
  }
  const emailHost = parts[1].trim().toLowerCase();
  const colleges = await College.find();
  const college = colleges.find((c) => emailHostMatchesDomainSuffix(emailHost, c.domain_suffix));
  if (!college) {
    return { error: { status: 403, body: { error: 'College not supported.' } } };
  }
  return { college: leanDoc(college), emailNorm, emailHost };
}

async function loadUserWithCollege(emailNorm) {
  const user = await User.findOne({ email: emailNorm.toLowerCase() });
  if (!user) return null;
  const college = await College.findOne({ id: user.college_id });
  const row = leanDoc(user);
  row.college_name = college?.name || null;
  return row;
}

exports.studentRequestOtp = async (req, res) => {
  if (!isEmailConfigured()) {
    return res.status(503).json({
      error:
        'Email is not configured. Set SMTP_EMAIL + SMTP_PASSWORD (Gmail app password) on Render, or DEV_OTP_TO_CONSOLE=true for local dev.'
    });
  }

  const rawEmail = req.body?.email;
  const nameTrim = String(req.body?.name || '').trim();
  if (!nameTrim) {
    return res.status(400).json({ error: 'Name is required.' });
  }

  try {
    const resolved = await resolveStudentCollege(rawEmail);
    if (resolved.error) {
      return res.status(resolved.error.status).json(resolved.error.body);
    }
    const { college, emailNorm } = resolved;

    const existing = await User.findOne({ email: emailNorm });
    if (existing && (existing.role === 'admin' || existing.role === 'superadmin')) {
      return res.status(403).json({ error: 'Staff accounts must sign in from the admin page.' });
    }

    const now = Date.now();
    const last = lastOtpSendAt.get(emailNorm) || 0;
    if (now - last < OTP_RESEND_COOLDOWN_MS) {
      return res.status(429).json({
        error: `Please wait ${Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - last)) / 1000)}s before requesting another code.`
      });
    }

    await cleanupExpiredOtps();
    await StudentSigninOtp.deleteMany({ email: emailNorm });

    const code = generateSixDigitCode();
    const otpHash = hashOtp(emailNorm, code);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await StudentSigninOtp.create({
      email: emailNorm,
      name: nameTrim.slice(0, 255),
      college_id: college.id,
      otp_hash: otpHash,
      expires_at: expiresAt
    });

    lastOtpSendAt.set(emailNorm, now);

    try {
      await sendOtpEmail(emailNorm, code, OTP_EXPIRY_MINUTES);
    } catch (mailErr) {
      console.error('sendOtpEmail error:', mailErr);
      await StudentSigninOtp.deleteMany({ email: emailNorm });
      lastOtpSendAt.delete(emailNorm);
      return res.status(502).json({ error: 'Could not send email. Check SMTP settings.' });
    }

    return res.json({
      message: `Check your inbox for a ${OTP_EXPIRY_MINUTES}-minute code.`,
      expiresInMinutes: OTP_EXPIRY_MINUTES
    });
  } catch (error) {
    console.error('studentRequestOtp error:', error);
    return res.status(500).json({ error: 'Server error.' });
  }
};

exports.studentVerifyOtp = async (req, res) => {
  const rawEmail = req.body?.email;
  const codeRaw = req.body?.code;
  const emailNorm = normalizeEmail(rawEmail);
  const code = String(codeRaw || '').replace(/\D/g, '');
  if (!emailNorm || !emailNorm.includes('@')) {
    return res.status(400).json({ error: 'A valid university email is required.' });
  }
  if (code.length !== 6) {
    return res.status(400).json({ error: 'Enter the 6-digit code from your email.' });
  }

  try {
    await cleanupExpiredOtps();

    const otpRow = await StudentSigninOtp.findOne({
      email: emailNorm,
      expires_at: { $gt: new Date() }
    }).sort({ id: -1 });

    if (!otpRow) {
      return res.status(400).json({ error: 'Invalid or expired code. Request a new one.' });
    }
    if (!verifyOtp(emailNorm, code, otpRow.otp_hash)) {
      return res.status(400).json({ error: 'Invalid code.' });
    }

    const collegeCheck = await resolveStudentCollege(emailNorm);
    if (collegeCheck.error) {
      return res.status(collegeCheck.error.status).json(collegeCheck.error.body);
    }
    if (collegeCheck.college.id !== otpRow.college_id) {
      return res.status(400).json({ error: 'College configuration changed. Request a new code.' });
    }

    const nameTrim = String(otpRow.name || '').trim().slice(0, 255);
    const college = collegeCheck.college;

    const existing = await User.findOne({ email: emailNorm });
    if (existing) {
      if (existing.role === 'admin' || existing.role === 'superadmin') {
        return res.status(403).json({ error: 'Staff accounts must sign in from the admin page.' });
      }
      existing.college_id = college.id;
      existing.name = nameTrim;
      existing.is_verified = true;
      existing.otp_code = null;
      existing.otp_expiry = null;
      await existing.save();
    } else {
      await User.create({
        name: nameTrim,
        email: emailNorm,
        college_id: college.id,
        is_verified: true
      });
    }

    await StudentSigninOtp.deleteMany({ email: emailNorm });
  } catch (error) {
    console.error('studentVerifyOtp error:', error);
    return res.status(500).json({ error: 'Server error.' });
  }

  try {
    const row = await loadUserWithCollege(emailNorm);
    if (!row) return res.status(500).json({ error: 'Server error.' });
    const token = signToken(row);
    res.json({
      user: {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        credits: row.credits,
        college_id: row.college_id,
        college_name: row.college_name,
        is_verified: row.is_verified
      },
      token
    });
  } catch (error) {
    console.error('studentVerifyOtp load user error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const emailNorm = String(email).trim().toLowerCase();

    const row = await loadUserWithCollege(emailNorm);
    if (!row) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (row.role !== 'admin' && row.role !== 'superadmin') {
      return res.status(403).json({ error: 'This sign-in is only for staff accounts.' });
    }
    if (!row.password) {
      return res.status(403).json({
        error: 'Admin password is not set. Run node create-admin.js from the backend folder.'
      });
    }

    const match = await bcrypt.compare(String(password), row.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(row);
    res.json({
      user: {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        credits: row.credits,
        college_id: row.college_id,
        college_name: row.college_name,
        is_verified: row.is_verified
      },
      token
    });
  } catch (error) {
    console.error('adminLogin error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getMe = async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};
