
function requireVerified(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  if (!req.user.is_verified) {
    return res.status(403).json({ error: 'Please verify your email with the OTP sent to you.' });
  }
  next();
}

module.exports = requireVerified;
