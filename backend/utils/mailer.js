const dns = require('dns').promises;
const net = require('net');
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

async function smtpConnectTarget(hostname) {
  const name = String(hostname || '').trim();
  if (!name) return { host: name, servername: null };
  if (net.isIP(name)) {
    const sn = (process.env.SMTP_TLS_SERVERNAME || '').trim() || null;
    return { host: name, servername: sn };
  }
  if (/^localhost$/i.test(name)) {
    return { host: name, servername: null };
  }
  if (process.env.SMTP_SKIP_IPV4_RESOLVE === 'true' || process.env.SMTP_SKIP_IPV4_RESOLVE === '1') {
    return { host: name, servername: null };
  }
  try {
    const v4 = await dns.resolve4(name);
    if (v4 && v4.length > 0) {
      return { host: v4[0], servername: name };
    }
  } catch {}
  return { host: name, servername: null };
}

async function createTransport() {
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = smtpUser();
  const pass = smtpPass();
  const { host, servername } = await smtpConnectTarget(smtpHost());
  const config = {
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
    connectionTimeout: 20_000,
    greetingTimeout: 20_000
  };
  if (process.env.SMTP_REQUIRE_TLS === 'true') {
    config.requireTLS = true;
  }
  const tlsOpts = {};
  if (servername) tlsOpts.servername = servername;
  if (process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'false') {
    tlsOpts.rejectUnauthorized = false;
  }
  if (Object.keys(tlsOpts).length) {
    config.tls = tlsOpts;
  }
  return nodemailer.createTransport(config);
}

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
  const transporter = await createTransport();
  await transporter.sendMail({
    from,
    to,
    subject: 'Your Learnexus login code',
    text: `Your one-time code is ${otp}. It expires in ${expiresMinutes} minutes.`,
    html: `<p>Your one-time code is <strong>${otp}</strong>.</p><p>It expires in ${expiresMinutes} minutes.</p><p>If you did not request this, you can ignore this email.</p>`
  });
}

module.exports = { sendOtpEmail, createTransport };
