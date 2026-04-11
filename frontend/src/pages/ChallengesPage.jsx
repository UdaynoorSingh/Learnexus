import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  ExternalLink,
  Coins,
  X,
  Send,
  Loader2,
  Sparkles,
  Users,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { fetchChallenges, submitChallengeSolution } from '../services/challengeService';
import { showToast } from '../services/toast';

const difficultyConfig = {
  Easy: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/10'
  },
  Medium: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/10'
  },
  Hard: {
    color: 'text-rose-400',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/30',
    glow: 'shadow-rose-500/10'
  }
};

const springAnim = { type: 'spring', stiffness: 400, damping: 30 };

const CompanyLogo = ({ companyName }) => {
  const [error, setError] = useState(false);
  
  // Attempt to guess domain (e.g. "Google" -> "google.com")
  const cleanName = typeof companyName === 'string' ? companyName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'company';
  const domain = `${cleanName}.com`;
  
  if (error) {
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName || 'Company')}&background=random&color=fff&rounded=true&bold=true`;
    return (
      <img src={avatarUrl} alt={companyName} className="w-10 h-10 rounded-xl shadow-sm border border-white/10" />
    );
  }
  
  return (
    <img 
      src={`https://logo.clearbit.com/${domain}?size=80`} 
      alt={`${companyName} logo`}
      onError={() => setError(true)}
      className="w-10 h-10 rounded-xl object-contain bg-white p-1 border border-white/10 shadow-sm"
    />
  );
};

const ChallengesPage = () => {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  const [githubUrl, setGithubUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    try {
      const data = await fetchChallenges();
      setChallenges(data);
    } catch (err) {
      console.error('Failed to load challenges:', err);
      if (!err.isRateLimit) {
        showToast('error', 'Failed to load challenges. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (challengeId) => {
    if (!githubUrl.trim()) {
      showToast('error', 'Please enter a valid GitHub URL.');
      return;
    }

    setSubmitting(true);
    try {
      await submitChallengeSolution(challengeId, githubUrl.trim());
      showToast('success', 'Solution submitted successfully! 🎉');
      setActiveModal(null);
      setGithubUrl('');
      loadChallenges();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to submit solution.';
      if (!err.isRateLimit) {
        showToast('error', msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 size={36} className="text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <Trophy size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text tracking-tight">
              Company Challenges
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              Solve real engineering problems from top companies &amp; earn credits
            </p>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6 mt-6 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Sparkles size={14} className="text-amber-400" />
            <span><strong className="text-text">{challenges.length}</strong> Active Challenges</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Coins size={14} className="text-amber-400" />
            <span>
              <strong className="text-text">
                {challenges.reduce((sum, c) => sum + (c.bounty_credits || 0), 0)}
              </strong>{' '}
              Total Credits Available
            </span>
          </div>
        </div>
      </motion.div>

      {/* Challenge Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {challenges.map((challenge, i) => {
          const diff = difficultyConfig[challenge.difficulty] || difficultyConfig.Medium;
          const tags = Array.isArray(challenge.tags)
            ? challenge.tags
            : typeof challenge.tags === 'string'
              ? JSON.parse(challenge.tags)
              : [];

          return (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25, delay: i * 0.05 }}
              whileHover={{ y: -8, scale: 1.02, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
              className="group relative rounded-3xl glass-panel overflow-hidden hover:border-primary/40 transition-all duration-500 hover:shadow-[0_20px_60px_-15px_rgba(14,165,233,0.3)]"
            >
              {/* Dynamic hover glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl z-0" />
              
              {/* Top accent bar */}
              <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-primary via-accent to-amber-500 opacity-50 group-hover:opacity-100 transition-opacity" />

              <div className="p-7 relative z-10">
                {/* Company + Difficulty Row */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <CompanyLogo companyName={challenge.company_name} />
                    <div>
                      <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">
                        {challenge.company_name}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${diff.bg} ${diff.color} ${diff.border}`}
                  >
                    {challenge.difficulty}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-text leading-snug mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                  {challenge.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-text-muted leading-relaxed line-clamp-3 mb-4">
                  {challenge.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {tags.slice(0, 5).map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white/5 text-text-muted border border-white/10 hover:border-primary/30 hover:text-primary transition-colors"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Footer: Bounty + Submissions + CTA */}
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Coins size={16} className="text-amber-400" />
                      <span className="text-sm font-bold text-amber-400 tabular-nums">
                        {challenge.bounty_credits}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-text-muted">
                      <Users size={13} />
                      <span className="text-xs tabular-nums">
                        {challenge.submission_count || 0}
                      </span>
                    </div>
                  </div>

                  <motion.button
                    type="button"
                    onClick={() => {
                      setActiveModal(challenge.id);
                      setGithubUrl('');
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={springAnim}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
                  >
                    <Trophy size={14} />
                    Solve & Claim
                  </motion.button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Empty state */}
      {challenges.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Trophy size={36} className="text-text-muted" />
          </div>
          <h3 className="text-xl font-bold text-text mb-2">No Challenges Yet</h3>
          <p className="text-sm text-text-muted">
            Company challenges will appear here soon. Check back later!
          </p>
        </motion.div>
      )}

      {/* Submission Modal */}
      <AnimatePresence>
        {activeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setActiveModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={springAnim}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1a2e]/95 backdrop-blur-xl p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Send size={18} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-text">Submit Solution</h2>
                    <p className="text-xs text-text-muted">Link your GitHub repo or code</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-white/5 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Challenge info */}
              {(() => {
                const ch = challenges.find((c) => c.id === activeModal);
                if (!ch) return null;
                const diff = difficultyConfig[ch.difficulty] || difficultyConfig.Medium;
                return (
                  <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-1">
                      {ch.company_name}
                    </p>
                    <p className="text-sm font-bold text-text leading-snug">{ch.title}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${diff.bg} ${diff.color} ${diff.border}`}>
                        {ch.difficulty}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-amber-400 font-semibold">
                        <Coins size={12} /> {ch.bounty_credits} credits
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* URL input */}
              <div className="mb-6">
                <label
                  htmlFor="github-url-input"
                  className="block text-sm font-medium text-text mb-2"
                >
                  GitHub / Code URL
                </label>
                <div className="relative">
                  <ExternalLink
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                  <input
                    id="github-url-input"
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/you/solution-repo"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-text placeholder:text-text-muted/60 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !submitting) {
                        handleSubmit(activeModal);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Submit button */}
              <motion.button
                type="button"
                onClick={() => handleSubmit(activeModal)}
                disabled={submitting || !githubUrl.trim()}
                whileHover={!submitting ? { scale: 1.02 } : {}}
                whileTap={!submitting ? { scale: 0.98 } : {}}
                transition={springAnim}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                  submitting || !githubUrl.trim()
                    ? 'bg-white/10 text-text-muted cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/25 hover:shadow-primary/40'
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    Submit Solution
                  </>
                )}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChallengesPage;
