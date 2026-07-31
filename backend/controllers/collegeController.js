const { College } = require('../models');
const { leanDocs } = require('../utils/mongoHelpers');

exports.listPublicColleges = async (req, res) => {
  try {
    const colleges = await College.find().sort({ name: 1 }).select('id name');
    res.json(leanDocs(colleges));
  } catch (error) {
    console.error('listPublicColleges error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};
