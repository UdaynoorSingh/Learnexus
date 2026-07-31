const { User, Transaction } = require('../models');
const { leanDocs } = require('../utils/mongoHelpers');

exports.getBalance = async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id });
    res.json({ credits: user?.credits ?? 0 });
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const txs = await Transaction.find({ user_id: req.user.id })
      .sort({ created_at: -1 })
      .limit(50);
    res.json(leanDocs(txs));
  } catch (error) {
    res.status(500).json({ error: 'Server error.' });
  }
};
