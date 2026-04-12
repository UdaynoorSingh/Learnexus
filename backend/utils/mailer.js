const nodemailer = require('nodemailer');

function smtpUser() {
  return (process.env.SMTP_USER || process.env.SMTP_EMAIL || '').trim();
}

function smtpPass() {
  return (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '').trim();
}

function smtpHost() {
  const explicit = (process.env.SMTP_HOST || '').trim();
  if (explicit) return explicit;
  const user = smtpUser();
  if (/@gmail\.com$/i.test(user) || /@googlemail\.com$/i.test(user)) {
    return 'smtp.gmail.com';
  }
  return 'localhost';
}

function createTransport() {
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = smtpUser();
  const pass = smtpPass();
  const config = {
    host: smtpHost(),
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
    connectionTimeout: 20_000,
    greetingTimeout: 20_000
  };
  if (process.env.SMTP_REQUIRE_TLS === 'true') {
    config.requireTLS = true;
  }
  if (process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'false') {
    config.tls = { ...(config.tls || {}), rejectUnauthorized: false };
  }
  return nodemailer.createTransport(config);
}

/**
 * Local dev without a mail server: set DEV_OTP_TO_CONSOLE=true and NODE_ENV=development
 * (OTP is printed to the server console instead of sending email).
 */
function shouldLogOtpToConsoleOnly() {
  return (
    process.env.NODE_ENV !== 'production' &&
    (process.env.DEV_OTP_TO_CONSOLE === 'true' || process.env.DEV_OTP_TO_CONSOLE === '1')
  );
}

async function sendOtpEmail(to, otp, expiresMinutes = 10) {
  if (shouldLogOtpToConsoleOnly()) {
    console.warn(`[DEV_OTP_TO_CONSOLE] OTP for ${to}: ${otp} (not sent by email; expires in ${expiresMinutes} min)`);
    return;
  }

  const from = process.env.SMTP_FROM || smtpUser() || 'noreply@learnexus.local';
  const transporter = createTransport();
  await transporter.sendMail({
    from,
    to,
    subject: 'Your Learnexus login code',
    text: `Your one-time code is ${otp}. It expires in ${expiresMinutes} minutes.`,
    html: `<p>Your one-time code is <strong>${otp}</strong>.</p><p>It expires in ${expiresMinutes} minutes.</p><p>If you did not request this, you can ignore this email.</p>`
  });
}

module.exports = { sendOtpEmail, createTransport };
