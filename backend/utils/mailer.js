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

/**
 * PaaS (e.g. Render) often has no working IPv6 egress. Nodemailer may still try Gmail's AAAA and fail
 * with ENETUNREACH. Prefer an IPv4 literal for the TCP connect and set tls.servername for cert validation.
 * Set SMTP_SKIP_IPV4_RESOLVE=true to use the hostname only (e.g. IPv6-only lab).
 */
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
  } catch {
    // Use hostname (IPv6-only host, DNS hiccup, etc.).
  }
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

function resendApiKey() {
  return (process.env.RESEND_API_KEY || '').trim();
}

/** HTTPS (443); works on hosts that block outbound SMTP (e.g. Render free web services). */
async function sendOtpViaResend(to, text, html) {
  const key = resendApiKey();
  const from =
    (process.env.RESEND_FROM || process.env.SMTP_FROM || '').trim() ||
    'Learnexus <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Your Learnexus login code',
      text,
      html
    })
  });
  const raw = await res.text();
  if (!res.ok) {
    let detail = raw.slice(0, 500);
    try {
      const j = JSON.parse(raw);
      detail = j.message || j.name || detail;
    } catch {
      /* keep detail */
    }
    throw new Error(`Resend ${res.status}: ${detail}`);
  }
}

async function sendOtpEmail(to, otp, expiresMinutes = 10) {
  if (shouldLogOtpToConsoleOnly()) {
    console.warn(`[DEV_OTP_TO_CONSOLE] OTP for ${to}: ${otp} (not sent by email; expires in ${expiresMinutes} min)`);
    return;
  }

  const text = `Your one-time code is ${otp}. It expires in ${expiresMinutes} minutes.`;
  const html = `<p>Your one-time code is <strong>${otp}</strong>.</p><p>It expires in ${expiresMinutes} minutes.</p><p>If you did not request this, you can ignore this email.</p>`;

  if (resendApiKey()) {
    await sendOtpViaResend(to, text, html);
    return;
  }

  const from = process.env.SMTP_FROM || smtpUser() || 'noreply@learnexus.local';
  const transporter = await createTransport();
  await transporter.sendMail({
    from,
    to,
    subject: 'Your Learnexus login code',
    text,
    html
  });
}

module.exports = { sendOtpEmail, createTransport };
