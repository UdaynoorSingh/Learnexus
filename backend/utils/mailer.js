const nodemailer = require('nodemailer');

function envTrim(key) {
  return String(process.env[key] || '').trim();
}

function smtpUser() {
  return envTrim('SMTP_USER') || envTrim('SMTP_EMAIL');
}

function smtpPass() {
  const raw = envTrim('SMTP_PASS') || envTrim('SMTP_PASSWORD');
  // Gmail app passwords are often copied as "xxxx xxxx xxxx xxxx" — strip spaces.
  return raw.replace(/\s+/g, '');
}

function isGmailAccount(email) {
  return /@(gmail|googlemail)\.com$/i.test(String(email || '').trim());
}

function shouldLogOtpToConsoleOnly() {
  return (
    process.env.NODE_ENV !== 'production' &&
    (process.env.DEV_OTP_TO_CONSOLE === 'true' || process.env.DEV_OTP_TO_CONSOLE === '1')
  );
}

function isEmailConfigured() {
  const devConsole =
    process.env.NODE_ENV !== 'production' &&
    (process.env.DEV_OTP_TO_CONSOLE === 'true' || process.env.DEV_OTP_TO_CONSOLE === '1');
  if (devConsole) return true;
  return !!(smtpUser() && smtpPass());
}

function otpEmailContent(otp, expiresMinutes) {
  return {
    subject: 'Your Learnexus login code',
    text: `Your one-time code is ${otp}. It expires in ${expiresMinutes} minutes.`,
    html: `<p>Your one-time code is <strong>${otp}</strong>.</p><p>It expires in ${expiresMinutes} minutes.</p><p>If you did not request this, you can ignore this email.</p>`
  };
}

function emailFromAddress() {
  const custom = envTrim('SMTP_FROM');
  if (custom) return custom;
  const user = smtpUser();
  return user ? `"Learnexus" <${user}>` : 'Learnexus <noreply@learnexus.local>';
}

let cachedTransport = null;
let cachedTransportKey = null;

async function createTransport() {
  const user = smtpUser();
  const pass = smtpPass();
  if (!user || !pass) {
    throw new Error('SMTP_EMAIL and SMTP_PASSWORD are required.');
  }

  const cacheKey = `${user}:${pass.length}:${envTrim('SMTP_HOST')}:${envTrim('SMTP_PORT')}`;
  if (cachedTransport && cachedTransportKey === cacheKey) {
    return cachedTransport;
  }

  const explicitHost = envTrim('SMTP_HOST');
  let transporter;

  // Gmail app password: use nodemailer's gmail preset (port 465 + TLS). Reliable on Render/cloud hosts.
  if (isGmailAccount(user) && !explicitHost) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      connectionTimeout: 30_000,
      greetingTimeout: 30_000,
      socketTimeout: 30_000
    });
  } else {
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    transporter = nodemailer.createTransport({
      host: explicitHost || 'smtp.gmail.com',
      port,
      secure,
      auth: { user, pass },
      requireTLS: !secure,
      connectionTimeout: 30_000,
      greetingTimeout: 30_000,
      socketTimeout: 30_000
    });
  }

  try {
    await transporter.verify();
  } catch (err) {
    console.error('SMTP verify failed:', err.message);
    throw new Error(
      `SMTP connection failed: ${err.message}. Use a Gmail App Password (not your normal password) and set SMTP_EMAIL + SMTP_PASSWORD on Render.`
    );
  }

  cachedTransport = transporter;
  cachedTransportKey = cacheKey;
  return transporter;
}

async function sendOtpEmail(to, otp, expiresMinutes = 10) {
  if (shouldLogOtpToConsoleOnly()) {
    console.warn(`[DEV_OTP_TO_CONSOLE] OTP for ${to}: ${otp} (not sent by email; expires in ${expiresMinutes} min)`);
    return;
  }

  const from = emailFromAddress();
  const { subject, text, html } = otpEmailContent(otp, expiresMinutes);
  const transporter = await createTransport();

  const info = await transporter.sendMail({ from, to, subject, text, html });
  console.log(`OTP email sent to ${to} (messageId: ${info.messageId || 'n/a'})`);
}

module.exports = { sendOtpEmail, createTransport, isEmailConfigured };
