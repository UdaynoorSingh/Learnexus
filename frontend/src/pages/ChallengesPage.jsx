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
import PageMascot from '../components/ui/PageMascot';
import EmptyState from '../components/ui/EmptyState';
import ModalShell from '../components/ui/ModalShell';
import Button from '../components/ui/Button';
import Chip from '../components/ui/Chip';

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

  const cleanName = typeof companyName === 'string' ? companyName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'company';
  const domain = `${cleanName}.com`;

  if (error) {
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName || 'Company')}&background=random&color=fff&rounded=true&bold=true`;
    return (
      <img src={avatarUrl} alt={companyName} className="w-10 h-10 rounded-xl shadow-sm border border-black/10" />
    );
  }

  return (
    <img
      src={`https://logo.clearbit.com/${domain}?size=80`}
      alt={`${companyName} logo`}
      onError={() => setError(true)}
      className="w-10 h-10 rounded-xl object-contain bg-white p-1 border border-black/10 shadow-sm"
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
      console.error(err);
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Trophy size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-text tracking-tight">
                Company Challenges
              </h1>
              <p className="text-sm text-text-muted mt-0.5">
                Solve real engineering problems from top companies & earn credits
              </p>
            </div>
          </div>
          
          <div className="hidden md:block shrink-0">
            <PageMascot role="challenges" size="lg" className="drop-shadow-xl" />
          </div>
        </div>

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
              whileHover={{ y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
              className="group relative rounded-3xl glass-panel overflow-hidden hover:border-primary/40 transition-all duration-500 hover:shadow-[0_20px_60px_-15px_rgba(14,165,233,0.3)]"
            >
              <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-primary via-accent to-amber-500 opacity-50 group-hover:opacity-100 transition-opacity" />

              <div className="p-7 relative z-10">
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

                <h3 className="text-lg font-bold text-text leading-snug mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                  {challenge.title}
                </h3>

                <p className="text-sm text-text-muted leading-relaxed line-clamp-3 mb-4">
                  {challenge.description}
                </p>

                <div className="flex flex-wrap gap-1.5 mb-5">
                  {tags.slice(0, 5).map((tag) => (
                    <Chip
                      key={tag}
                      size="xs"
                    >
                      {tag}
                    </Chip>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-black/10">
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

                  <Button
                    type="button"
                    onClick={() => {
                      setActiveModal(challenge.id);
                      setGithubUrl('');
                    }}
                    className="px-4 py-2 rounded-xl text-sm font-semibold shadow-lg"
                  >
                    <Trophy size={14} />
                    Solve & Claim
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {challenges.length === 0 && !loading && (
        <EmptyState
          illustration="feed"
          title="No challenges yet"
          description="When partners publish bounties, they will appear here. You can still earn credits from uploads and the AI Tutor in the meantime."
          ctaLabel="Back to dashboard"
          to="/dashboard"
        />
      )}

      <ModalShell
        open={Boolean(activeModal)}
        onClose={() => setActiveModal(null)}
        title="Submit solution"
        subtitle="Link your GitHub repo or code"
        icon={<Send size={18} className="text-primary" />}
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="soft" type="button" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => handleSubmit(activeModal)}
              disabled={submitting || !githubUrl.trim()}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Submit
                </>
              )}
            </Button>
          </>
        }
      >
        {(() => {
          const ch = challenges.find((c) => c.id === activeModal);
          if (!ch) return null;
          const diff = difficultyConfig[ch.difficulty] || difficultyConfig.Medium;
          return (
            <div className="p-4 rounded-2xl bg-white/70 border border-black/10">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-1">
                {ch.company_name}
              </p>
              <p className="text-sm font-bold text-text leading-snug">{ch.title}</p>
              <div className="flex items-center gap-3 mt-2">
                <Chip className={`border ${diff.bg} ${diff.color} ${diff.border}`} size="xs">
                  {ch.difficulty}
                </Chip>
                <Chip variant="warning" size="xs">
                  <Coins size={12} /> {ch.bounty_credits} credits
                </Chip>
              </div>
            </div>
          );
        })()}

        <div>
          <label htmlFor="github-url-input" className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
            GitHub / Code URL
          </label>
          <div className="relative">
            <ExternalLink size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              id="github-url-input"
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/you/solution-repo"
              className="w-full pl-10 pr-4 py-3 rounded-xl ln-field text-sm placeholder:text-text-muted/60"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !submitting) handleSubmit(activeModal);
              }}
            />
          </div>
        </div>
      </ModalShell>
    </div>
  );
};

export default ChallengesPage;
