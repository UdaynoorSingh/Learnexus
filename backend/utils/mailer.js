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

function gmailTransportConfigs(user, pass) {
  const explicitHost = envTrim('SMTP_HOST');
  if (explicitHost) {
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    return [{
      host: explicitHost,
      port,
      secure,
      auth: { user, pass },
      requireTLS: !secure,
      connectionTimeout: 30_000,
      greetingTimeout: 30_000,
      socketTimeout: 30_000
    }];
  }

  if (isGmailAccount(user)) {
    return [
      {
        service: 'gmail',
        auth: { user, pass },
        connectionTimeout: 30_000,
        greetingTimeout: 30_000,
        socketTimeout: 30_000
      },
      {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user, pass },
        connectionTimeout: 30_000,
        greetingTimeout: 30_000,
        socketTimeout: 30_000
      },
      {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: { user, pass },
        requireTLS: true,
        connectionTimeout: 30_000,
        greetingTimeout: 30_000,
        socketTimeout: 30_000
      }
    ];
  }

  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  return [{
    host: explicitHost || 'smtp.gmail.com',
    port,
    secure,
    auth: { user, pass },
    requireTLS: !secure,
    connectionTimeout: 30_000,
    greetingTimeout: 30_000,
    socketTimeout: 30_000
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
  const configs = gmailTransportConfigs(user, pass);
  const errors = [];

  for (const config of configs) {
    const label = config.service || `${config.host}:${config.port}`;
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

async function sendOtpEmail(to, otp, expiresMinutes = 10) {
  if (shouldLogOtpToConsoleOnly()) {
    console.warn(`[DEV_OTP_TO_CONSOLE] OTP for ${to}: ${otp} (expires in ${expiresMinutes} min)`);
    return;
  }

  await sendViaSmtp(to, otp, expiresMinutes);
}

module.exports = { sendOtpEmail, isEmailConfigured };
