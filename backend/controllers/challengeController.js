const { CompanyChallenge, ChallengeSubmission } = require('../models');
const { leanDoc, leanDocs } = require('../utils/mongoHelpers');

exports.getChallenges = async (req, res) => {
  try {
    const challenges = await CompanyChallenge.find().sort({ created_at: -1 });
    const rows = await Promise.all(
      leanDocs(challenges).map(async (cc) => {
        const submissionCount = await ChallengeSubmission.countDocuments({ challenge_id: cc.id });
        return { ...cc, submission_count: submissionCount };
      })
    );
    res.json(rows);
  } catch (error) {
    console.error('getChallenges error:', error);
    res.status(500).json({ error: 'Server error fetching challenges.' });
  }
};

exports.submitChallenge = async (req, res) => {
  try {
    const { challenge_id, github_url } = req.body;
    const userId = req.user.id;

    if (!challenge_id || !Number.isInteger(Number(challenge_id))) {
      return res.status(400).json({ error: 'Valid challenge_id is required.' });
    }

    if (!github_url || typeof github_url !== 'string' || !github_url.trim()) {
      return res.status(400).json({ error: 'A valid GitHub URL is required.' });
    }

    const trimmedUrl = github_url.trim();

    try {
      const parsed = new URL(trimmedUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return res.status(400).json({ error: 'URL must use http or https protocol.' });
      }
    } catch {
      return res.status(400).json({ error: 'Invalid URL format.' });
    }

    const challenge = await CompanyChallenge.findOne({ id: Number(challenge_id) });
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found.' });
    }

    const existing = await ChallengeSubmission.findOne({
      challenge_id: Number(challenge_id),
      user_id: userId
    });

    if (existing) {
      return res.status(409).json({ error: 'You have already submitted a solution for this challenge.' });
    }

    const submission = await ChallengeSubmission.create({
      challenge_id: Number(challenge_id),
      user_id: userId,
      github_url: trimmedUrl,
      status: 'Pending'
    });

    res.status(201).json({
      message: 'Solution submitted successfully! It will be reviewed shortly.',
      submission: leanDoc(submission)
    });
  } catch (error) {
    console.error('submitChallenge error:', error);
    res.status(500).json({ error: 'Server error submitting challenge solution.' });
  }
};
