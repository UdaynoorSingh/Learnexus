const pool = require('../config/db');

/** Public list for Explore (id + name only). */
exports.listPublicColleges = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name FROM colleges ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('listPublicColleges error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
};
