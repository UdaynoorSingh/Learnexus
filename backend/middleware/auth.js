const jwt = require('jsonwebtoken');
const { User, College } = require('../models');
const { leanDoc } = require('../utils/mongoHelpers');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token.' });
    }

    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    const college = await College.findOne({ id: user.college_id });
    const row = leanDoc(user);
    row.college_name = college?.name || null;
    req.user = row;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

module.exports = auth;
