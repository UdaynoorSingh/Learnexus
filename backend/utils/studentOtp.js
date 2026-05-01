const crypto = require('crypto');

function pepper() {
  const p = process.env.OTP_PEPPER || process.env.JWT_SECRET;
  if (!p) {
    throw new Error('JWT_SECRET (or OTP_PEPPER) must be set for OTP hashing.');
  }
  return p;
}

function generateSixDigitCode() {
  const n = crypto.randomInt(100000, 1000000);
  return String(n);
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function hashOtp(email, sixDigitCode) {
  const e = normalizeEmail(email);
  const digits = String(sixDigitCode || '').replace(/\D/g, '').slice(0, 6);
  return crypto.createHmac('sha256', pepper()).update(`${e}|${digits}`).digest('hex');
}

function verifyOtp(email, enteredCode, storedHashHex) {
  if (!storedHashHex || typeof storedHashHex !== 'string' || storedHashHex.length !== 64) {
    return false;
  }
  const candidate = hashOtp(email, enteredCode);
  try {
    const a = Buffer.from(candidate, 'hex');
    const b = Buffer.from(storedHashHex, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

module.exports = { generateSixDigitCode, hashOtp, verifyOtp, normalizeEmail };
