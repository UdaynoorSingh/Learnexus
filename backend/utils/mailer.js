const dns = require('dns').promises;
const nodemailer = require('nodemailer');

function envTrim(key) {
  return String(process.env[key] || '').trim();
}

function smtpUser() {
  return envTrim('SMTP_USER') || envTrim('SMTP_EMAIL');
}

function smtpPass() {
  const raw = envTrim('SMTP_PASS') || envTrim('SMTP_PASSWORD');
  return raw.replace(/\s+/g, '');
}

function resendApiKey() {
  return envTrim('RESEND_API_KEY');
}

function brevoApiKey() {
  return envTrim('BREVO_API_KEY');
}

function brevoSenderEmail() {
  return envTrim('BREVO_SENDER_EMAIL') || smtpUser();
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
  if (shouldLogOtpToConsoleOnly()) return true;
  if (smtpUser() && smtpPass()) return true;
  if (brevoApiKey()) return true;
  return !!resendApiKey();
}

function otpEmailContent(otp, expiresMinutes) {
  return {
    subject: 'Your Learnexus login code',
    text: `Your one-time code is ${otp}. It expires in ${expiresMinutes} minutes.`,
    html: `<p>Your one-time code is <strong>${otp}</strong>.</p><p>It expires in ${expiresMinutes} minutes.</p><p>If you did not request this, you can ignore this email.</p>`
  };
}

function emailFromAddress() {
  const custom = envTrim('SMTP_FROM') || envTrim('RESEND_FROM');
  if (custom) return custom;
  const user = smtpUser();
  return user ? `"Learnexus" <${user}>` : 'Learnexus <noreply@learnexus.local>';
}

/** Render often fails IPv6 to Gmail (ENETUNREACH). Connect via IPv4 with correct TLS SNI. */
async function smtpConnectTarget(hostname) {
  const name = String(hostname || 'smtp.gmail.com').trim();
  try {
    const v4 = await dns.resolve4(name);
    if (v4?.length) {
      return { host: v4[0], servername: name };
    }
  } catch (err) {
    console.warn(`IPv4 lookup failed for ${name}:`, err.message);
  }
  return { host: name, servername: null };
}

async function buildSmtpConfigs(user, pass) {
  const explicitHost = envTrim('SMTP_HOST');

  if (explicitHost) {
    const { host, servername } = await smtpConnectTarget(explicitHost);
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const tls = servername ? { servername } : undefined;
    return [{
      host,
      port,
      secure,
      auth: { user, pass },
      requireTLS: !secure,
      tls,
      connectionTimeout: 20_000,
      greetingTimeout: 20_000,
      socketTimeout: 20_000
    }];
  }

  if (isGmailAccount(user)) {
    const { host, servername } = await smtpConnectTarget('smtp.gmail.com');
    const tls = servername ? { servername } : undefined;
    return [
      {
        host,
        port: 465,
        secure: true,
        auth: { user, pass },
        tls,
        connectionTimeout: 20_000,
        greetingTimeout: 20_000,
        socketTimeout: 20_000
      },
      {
        host,
        port: 587,
        secure: false,
        auth: { user, pass },
        requireTLS: true,
        tls,
        connectionTimeout: 20_000,
        greetingTimeout: 20_000,
        socketTimeout: 20_000
      }
    ];
  }

  const { host, servername } = await smtpConnectTarget('smtp.gmail.com');
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const tls = servername ? { servername } : undefined;
  return [{
    host,
    port,
    secure,
    auth: { user, pass },
    requireTLS: !secure,
    tls,
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 20_000
  }];
}

async function sendViaSmtp(to, otp, expiresMinutes) {
  const user = smtpUser();
  const pass = smtpPass();
  if (!user || !pass) {
    throw new Error('SMTP_EMAIL and SMTP_PASSWORD are required.');
  }

  const from = emailFromAddress();
  const { subject, text, html } = otpEmailContent(otp, expiresMinutes);
  const configs = await buildSmtpConfigs(user, pass);
  const errors = [];

  for (const config of configs) {
    const label = `${config.tls?.servername || config.host}:${config.port}`;
    try {
      const transporter = nodemailer.createTransport(config);
      const info = await transporter.sendMail({ from, to, subject, text, html });
      console.log(`OTP email sent via SMTP (${label}) to ${to} (messageId: ${info.messageId || 'n/a'})`);
      return info;
    } catch (err) {
      const msg = err?.message || String(err);
      console.error(`SMTP attempt failed (${label}):`, msg);
      errors.push(`${label}: ${msg}`);
    }
  }

  throw new Error(errors.join(' | '));
}

async function sendViaBrevo(to, otp, expiresMinutes) {
  const apiKey = brevoApiKey();
  const senderEmail = brevoSenderEmail();
  if (!apiKey) throw new Error('BREVO_API_KEY is not set.');
  if (!senderEmail) throw new Error('BREVO_SENDER_EMAIL (or SMTP_EMAIL) is required.');

  const { subject, html, text } = otpEmailContent(otp, expiresMinutes);

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'Learnexus', email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text
    })
  });

  const bodyText = await response.text();
  let body = {};
  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    body = { message: bodyText };
  }

  if (!response.ok) {
    const detail = body?.message || bodyText || response.statusText;
    console.error('Brevo API error:', response.status, detail);
    throw new Error(`Brevo rejected the email: ${detail}`);
  }

  console.log(`OTP email sent via Brevo (${senderEmail}) to ${to}`);
  return body;
}

async function sendViaResend(to, otp, expiresMinutes) {
  const apiKey = resendApiKey();
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set.');
  }

  const from = emailFromAddress();
  const { subject, html, text } = otpEmailContent(otp, expiresMinutes);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from, to: [to], subject, html, text })
  });

  const bodyText = await response.text();
  let body = {};
  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    body = { message: bodyText };
  }

  if (!response.ok) {
    const detail = body?.message || body?.error || bodyText || response.statusText;
    console.error('Resend API error:', response.status, detail);
    throw new Error(`Resend rejected the email: ${detail}`);
  }

  console.log(`OTP email sent via Resend to ${to} (id: ${body?.id || 'n/a'})`);
  return body;
}

async function sendViaHttpsFallback(to, otp, expiresMinutes) {
  if (brevoApiKey()) {
    console.warn('SMTP unavailable on this host. Using Brevo API (personal Gmail sender).');
    return sendViaBrevo(to, otp, expiresMinutes);
  }
  if (resendApiKey()) {
    console.warn('SMTP unavailable on this host. Using Resend API fallback.');
    return sendViaResend(to, otp, expiresMinutes);
  }
  throw new Error('No HTTPS email fallback configured. Set BREVO_API_KEY for personal Gmail.');
}

async function sendOtpEmail(to, otp, expiresMinutes = 10) {
  if (shouldLogOtpToConsoleOnly()) {
    console.warn(`[DEV_OTP_TO_CONSOLE] OTP for ${to}: ${otp} (expires in ${expiresMinutes} min)`);
    return;
  }

  if (smtpUser() && smtpPass()) {
    try {
      return await sendViaSmtp(to, otp, expiresMinutes);
    } catch (smtpErr) {
      if (!brevoApiKey() && !resendApiKey()) throw smtpErr;
      return sendViaHttpsFallback(to, otp, expiresMinutes);
    }
  }

  if (brevoApiKey()) return sendViaBrevo(to, otp, expiresMinutes);
  return sendViaResend(to, otp, expiresMinutes);
}

module.exports = { sendOtpEmail, isEmailConfigured };
