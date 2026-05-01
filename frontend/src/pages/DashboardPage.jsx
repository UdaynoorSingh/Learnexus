import { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  FiBook, FiFileText, FiTrendingUp, FiZap, FiUpload, FiCompass, FiClock,
  FiPlay, FiMessageSquare, FiAward, FiBookOpen, FiGlobe, FiYoutube,
} from 'react-icons/fi';
import { GraduationCap, Library, Trophy, Sparkles, Pin, Wand2, Calendar, ArrowRight, Flame, CheckCircle2 } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import GradientText from '../components/reactbits/GradientText';
import Particles from '../components/reactbits/Particles';
import SplitText from '../components/reactbits/SplitText';
import WavyUnderline from '../components/ui/WavyUnderline';
import GeometricShapes from '../components/ui/GeometricShapes';
import PageMascot from '../components/ui/PageMascot';
import EmptyState from '../components/ui/EmptyState';
import DigitalGraph3D from '../components/reactbits/DigitalGraph3D';
import heroIllustration from '../assets/illustrations/dashboard-hero.svg';
import planningIllustration from '../assets/illustrations/planning-notes.svg';
import collaborationWhiteboardIllustration from '../assets/illustrations/collaboration-whiteboard.svg';
import collaborationChatIllustration from '../assets/illustrations/collaboration-chat.svg';
import workspaceSnapshotIllustration from '../assets/illustrations/workspace-snapshot.svg';

const spring = { type: 'spring', stiffness: 420, damping: 32 };
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 350, damping: 25 } }
};

const statRowVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.11, delayChildren: 0.06 },
  },
};
const statCardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.94 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 380, damping: 28 },
  },
};

const toDayKey = (d) => {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const addDays = (d, delta) => {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + delta);
  return dt;
};


const TiltCard = ({ children, className = '', glowColor = 'rgba(14,165,233,0.15)', floatDelay = 0, variants: cardVariants = itemVariants }) => {
  const ref = useRef(null);

  return (
    <motion.div
      ref={ref}
      variants={cardVariants}
      className={`relative group cursor-default ${className}`}
    >
      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
};


const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [recentNotes, setRecentNotes] = useState([]);
  const [conceptGraph, setConceptGraph] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pinned, setPinned] = useState([]);
  const [pinsIndex, setPinsIndex] = useState({});
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [taskPrompt, setTaskPrompt] = useState('');
  const [taskIdeas, setTaskIdeas] = useState([]);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);

  useEffect(() => { fetchDashboardData(); }, []);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('learnexus:pinnedActions');
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setPinned(parsed);
    } catch {
      setPinned([]);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('learnexus:pinnedActions', JSON.stringify(pinned));
    } catch {
      // ignore
    }
  }, [pinned]);

  const fetchDashboardData = async () => {
    try {
      try {
        const overviewRes = await api.get('/dashboard/overview');
        const pins = Array.isArray(overviewRes.data?.pins) ? overviewRes.data.pins : [];
        const pinHrefList = pins.map((p) => p.href).filter(Boolean).slice(0, 6);
        const idx = {};
        for (const p of pins) {
          if (p?.href) idx[p.href] = p;
        }
        setPinsIndex(idx);
        if (pinHrefList.length > 0) setPinned(pinHrefList);

        setUpcomingSessions(Array.isArray(overviewRes.data?.upcomingSessions) ? overviewRes.data.upcomingSessions : []);
        setTimelineEvents(Array.isArray(overviewRes.data?.events) ? overviewRes.data.events : []);
      } catch {
        // ignore
      }

      try {
        const [statsRes, chartRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/chart-stats')
        ]);
        setStats(statsRes.data);
        setChartData(chartRes.data);
      } catch {
        setStats({ totalUsers: 0, totalNotes: 0, totalTopics: 0, pendingNotes: 0 });
        setChartData(null);
      }
      const creditsRes = await api.get('/credits/history');
      setRecentNotes(creditsRes.data.slice(0, 5));

      try {
        const graphRes = await api.get('/dashboard/concept-graph');
        setConceptGraph(graphRes.data);
      } catch {
        setConceptGraph(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const activity = useMemo(() => {
    const days = new Set();
    for (const tx of recentNotes) {
      const k = toDayKey(tx.created_at);
      if (k) days.add(k);
    }
    const todayKey = toDayKey(new Date());
    const yesterdayKey = toDayKey(addDays(new Date(), -1));
    const streakAnchor = days.has(todayKey) ? new Date() : days.has(yesterdayKey) ? addDays(new Date(), -1) : null;
    let streak = 0;
    if (streakAnchor) {
      for (let i = 0; i < 365; i++) {
        const k = toDayKey(addDays(streakAnchor, -i));
        if (!k || !days.has(k)) break;
        streak += 1;
      }
    }
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const dt = addDays(new Date(), -i);
      const k = toDayKey(dt);
      last7.push({ key: k, label: dt.toLocaleDateString(undefined, { weekday: 'short' }), active: k ? days.has(k) : false });
    }
    return { streak, last7, activeDaysLast7: last7.filter((x) => x.active).length };
  }, [recentNotes]);

  if (loading) return <LoadingSpinner size="lg" text="Loading dashboard..." />;

  const statCards = [
    { label: 'Credits', value: user?.credits || 0, icon: FiZap, chip: 'bg-warning/10 text-warning border border-warning/25' },
    { label: 'Total Topics', value: stats?.totalTopics || 0, icon: FiBook, chip: 'bg-primary/10 text-primary border border-primary/25' },
    { label: 'Total Notes', value: stats?.totalNotes || 0, icon: FiFileText, chip: 'bg-secondary/10 text-secondary border border-secondary/25' },
    { label: 'Pending Review', value: stats?.pendingNotes || 0, icon: FiTrendingUp, chip: 'bg-success/10 text-success border border-success/25' },
  ];

  const totalTopics = stats?.totalTopics ?? 0;
  const totalNotes = stats?.totalNotes ?? 0;
  const showLibraryEmpty = totalTopics === 0 || totalNotes === 0;
  const emptyDescription =
    totalTopics === 0 && totalNotes === 0
      ? 'Your workspace is ready — add topics and notes, or jump into the community and AI tutor to seed your first learning path.'
      : totalTopics === 0
        ? 'No topics yet — generate a structured course or explore the Nexus Board to discover what others are building.'
        : 'No notes yet — upload materials or open the Nexus Board to capture ideas and discussion.';

  const quickActions = [
    { to: '/upload', icon: FiUpload, label: 'Upload Notes', desc: 'Earn credits', chip: 'bg-primary/10 text-primary border border-primary/25' },
    { to: '/explorer', icon: FiCompass, label: 'Browse Topics', desc: 'Explore resources', chip: 'bg-secondary/10 text-secondary border border-secondary/25' },
    { to: '/video-learn', icon: FiYoutube, label: 'YouTube Learn', desc: 'Video lectures', chip: 'bg-danger/10 text-danger border border-danger/25' },
    { to: '/ai-tutor', icon: GraduationCap, label: 'AI Tutor', desc: 'Personal tutor', chip: 'bg-success/10 text-success border border-success/25' },
    { to: '/nexus-board', icon: FiMessageSquare, label: 'Nexus Board', desc: 'Community hub', chip: 'bg-accent/5 text-text border border-black/10' },
    { to: '/nexus-library', icon: Library, label: 'Nexus Library', desc: 'Study material', chip: 'bg-warning/10 text-warning border border-warning/25' },
    { to: '/challenges', icon: Trophy, label: 'Challenges', desc: 'Compete & earn', chip: 'bg-black/5 text-text border border-black/10' },
    { to: '/profile', icon: FiAward, label: 'Profile', desc: 'Your journey', chip: 'bg-black/5 text-text border border-black/10' },
  ];

  const togglePin = async (to) => {
    const nextPinned = pinned.includes(to) ? pinned.filter((x) => x !== to) : [to, ...pinned].slice(0, 6);
    setPinned(nextPinned);

    try {
      if (pinsIndex?.[to]?.id) {
        await api.delete(`/dashboard/pins/${pinsIndex[to].id}`);
        setPinsIndex((prev) => {
          const copy = { ...(prev || {}) };
          delete copy[to];
          return copy;
        });
      } else {
        const action = quickActions.find((a) => a.to === to);
        const created = await api.post('/dashboard/pins', {
          kind: 'route',
          label: action?.label || 'Pinned action',
          href: to,
          icon: action?.label || null,
          position: 0,
        });
        setPinsIndex((prev) => ({ ...(prev || {}), [to]: created.data || created }));
      }
    } catch {
      // ignore
    }
  };

  const sortedActions = [
    ...quickActions.filter((a) => pinned.includes(a.to)).sort((a, b) => pinned.indexOf(a.to) - pinned.indexOf(b.to)),
    ...quickActions.filter((a) => !pinned.includes(a.to)),
  ];

  const handleGenerateTaskIdeas = async (e) => {
    e.preventDefault();
    const t = taskPrompt.trim();
    if (!t) return;
    
    setIsGeneratingTasks(true);
    try {
      const res = await api.post('/ai/task-ideas', { prompt: t });
      if (res.data?.ideas) {
        setTaskIdeas(res.data.ideas);
      }
    } catch (err) {
      console.error('Failed to generate task ideas:', err);
      setTaskIdeas([
        `Make a 20‑minute plan for: ${t}`,
        `List key concepts + 5 practice questions on: ${t}`,
      ]);
    } finally {
      setIsGeneratingTasks(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface/95 backdrop-blur-xl border border-black/10 p-3 rounded-xl shadow-xl shadow-black/10">
          <p className="text-text font-bold mb-1 text-xs">{label}</p>
          <p className="text-primary text-sm font-bold">{payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      className="relative space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div
        variants={itemVariants}
        className="relative rounded-3xl overflow-hidden"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 10%, rgba(239, 68, 68, 0.10), transparent 40%), radial-gradient(circle at 85% 20%, rgba(249, 115, 22, 0.10), transparent 45%), radial-gradient(circle at 55% 90%, rgba(15, 23, 42, 0.05), transparent 55%)',
        }}
      >
        <div className="absolute inset-0 z-0">
          <Particles
            particleCount={90}
            particleSpread={10}
            speed={0.06}
            particleColors={['#7c3aed', '#f59e0b', '#3b82f6']}
            moveParticlesOnHover={true}
            particleHoverFactor={1.25}
            alphaParticles={true}
            particleBaseSize={70}
            sizeRandomness={0.8}
            cameraDistance={22}
          />
        </div>
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-[1]" />
        <div
          className="absolute inset-0 z-[1] opacity-[0.22]"
          style={{
            backgroundImage:
              'radial-gradient(rgba(15,23,42,0.35) 0.7px, transparent 0.7px)',
            backgroundSize: '18px 18px',
            backgroundPosition: '0 0',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.85), rgba(0,0,0,0))',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.85), rgba(0,0,0,0))',
          }}
        />

        <div className="relative z-[2] p-7 md:p-9">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-black/10 px-3 py-1.5 text-xs font-semibold text-text shadow-sm">
              <Sparkles size={14} className="text-primary" />
              Your workspace
            </div>

            <h1 className="text-3xl md:text-4xl font-black text-text tracking-tight leading-tight mt-4 font-['Outfit']">
              Welcome back,
            </h1>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight font-['Outfit'] mt-0.5">
              <WavyUnderline color="#f59e0b" strokeWidth={3.5} animationDelay={0.6}>
                <span className="text-[#f59e0b]">{user?.name || 'Student'}</span>
              </WavyUnderline>
            </h1>

            <motion.p
              className="text-text-muted text-sm md:text-base mt-3 max-w-xl"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.45 }}
            >
              All your study tools in one place — notes, AI help, and progress.
            </motion.p>

            <motion.div
              className="flex flex-wrap gap-3 mt-5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
            >
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 px-7 py-3 text-sm font-bold text-white rounded-full bg-[#7c3aed] hover:bg-[#6d28d9] transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:-translate-y-0.5"
              >
                <FiUpload size={18} /> Upload Notes
              </Link>
              <Link
                to="/explorer"
                className="btn-secondary-outline py-3 px-7 rounded-full flex items-center gap-2 text-sm font-bold"
              >
                <FiCompass size={18} /> Explore
              </Link>
            </motion.div>
          </div>
        </div>

        <div className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 z-[2] hidden lg:flex items-center gap-8" style={{ perspective: '1000px' }}>
          <PageMascot role="dashboard" size="hero" className="drop-shadow-2xl" />

          <GeometricShapes size="sm" className="opacity-90" />
        </div>
      </motion.div>

      <motion.div variants={statRowVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, i) => (
          <TiltCard key={i} variants={statCardVariants} glowColor="rgba(15,23,42,0.06)" floatDelay={i * 0.8}>
            <div className="glass-panel p-6 rounded-2xl h-full">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-text-muted uppercase tracking-widest">{stat.label}</p>
                  <motion.div
                    className="mt-2 text-3xl font-black text-text tracking-tight tabular-nums"
                    initial={{ scale: 0.96, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ ...spring, delay: 0.15 + i * 0.06 }}
                  >
                    {stat.value}
                  </motion.div>
                </div>
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${stat.chip}`}>
                  <stat.icon size={20} />
                </div>
              </div>
            </div>
          </TiltCard>
        ))}
      </motion.div>

      {showLibraryEmpty && (
        <motion.div variants={itemVariants} className="max-w-lg mx-auto">
          <EmptyState
            title="Bring your workspace to life"
            description={emptyDescription}
            ctaLabel="Explore Nexus Board"
            to="/nexus-board"
            secondaryCtaLabel="Generate a Course"
            secondaryTo="/ai-tutor"
            vibrantCta
            illustration="feed"
          />
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-text flex items-center gap-2">
              <FiGlobe className="text-primary" size={18} />
              Quick Actions
            </h2>
            <p className="text-xs text-text-muted mt-1">Pin your most-used actions for faster access.</p>
          </div>
          {pinned.length > 0 && (
            <div className="text-xs text-text-muted inline-flex items-center gap-2 bg-white/80 border border-black/10 rounded-full px-3 py-1 shadow-sm">
              <Pin size={14} className="text-primary" />
              {pinned.length} pinned
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedActions.map((action, i) => (
            <TiltCard key={i} glowColor="rgba(255,255,255,0.05)" floatDelay={i * 0.4}>
              <div className="relative h-full">
                <Link
                  to={action.to}
                  className="block p-5 rounded-2xl bg-white/85 border border-black/10 h-full hover:shadow-lg hover:shadow-black/10 transition-all duration-300 group/action"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`inline-flex items-center justify-center w-11 h-11 rounded-2xl mb-3 ${action.chip}`}>
                      <action.icon size={20} />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        togglePin(action.to);
                      }}
                      className={`mt-1 inline-flex items-center justify-center w-9 h-9 rounded-xl border transition-colors ${pinned.includes(action.to)
                          ? 'bg-primary/10 border-primary/25 text-primary'
                          : 'bg-white/70 border-black/10 text-text-muted hover:text-text hover:bg-black/5'
                        }`}
                      aria-label={pinned.includes(action.to) ? 'Unpin action' : 'Pin action'}
                      title={pinned.includes(action.to) ? 'Pinned' : 'Pin'}
                    >
                      <Pin size={16} />
                    </button>
                  </div>
                  <p className="text-sm font-bold text-text tracking-wide">{action.label}</p>
                  <p className="text-[11px] text-text-muted mt-1">{action.desc}</p>
                </Link>
              </div>
            </TiltCard>
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <TiltCard glowColor="rgba(249,115,22,0.10)" floatDelay={0.25}>
            <div className="glass-panel p-6 rounded-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-text flex items-center gap-2">
                    <Flame size={16} className="text-secondary" />
                    Consistency
                  </h3>
                  <p className="text-xs text-text-muted mt-1">Keep the streak alive with small daily progress.</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-text-muted">Streak</p>
                  <p className="mt-1 text-3xl font-black text-text tabular-nums">
                    {activity.streak}
                    <span className="text-sm font-bold text-text-muted ml-1">days</span>
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-7 gap-2">
                {activity.last7.map((d) => (
                  <div key={d.key || d.label} className="text-center">
                    <div
                      className={`h-10 rounded-2xl border flex items-center justify-center transition-colors ${d.active
                          ? 'bg-success/12 border-success/25 text-success'
                          : 'bg-white/70 border-black/10 text-text-muted'
                        }`}
                      title={d.key || d.label}
                    >
                      {d.active ? <CheckCircle2 size={18} /> : <span className="text-xs font-semibold">{d.label.slice(0, 1)}</span>}
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-widest font-semibold text-text-muted">
                      {d.label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xs text-text-muted">
                  Active days (7d): <span className="text-text font-semibold">{activity.activeDaysLast7}</span>
                </p>
                <Link to="/upload" className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1">
                  Upload something today <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </TiltCard>

          <TiltCard glowColor="rgba(239,68,68,0.08)" floatDelay={0.4}>
            <div className="glass-panel p-6 rounded-2xl overflow-hidden">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-text flex items-center gap-2">
                    <Wand2 size={16} className="text-primary" />
                    AI Task Ideas
                  </h3>
                  <p className="text-xs text-text-muted mt-1">Type what you’re studying — get instant ideas.</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <div className="hidden sm:block w-14 h-14 rounded-2xl overflow-hidden border border-black/10 bg-white/70 shrink-0">
                  <img
                    src={planningIllustration}
                    alt="Cartoon illustration of planning notes"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="text-xs text-text-muted leading-relaxed">
                  Tip: keep prompts specific (topic + goal + deadline) for better suggestions.
                </div>
              </div>

              <form onSubmit={handleGenerateTaskIdeas} className="mt-4 flex gap-2">
                <input
                  value={taskPrompt}
                  onChange={(e) => setTaskPrompt(e.target.value)}
                  placeholder="e.g. DSA arrays + time complexity"
                  disabled={isGeneratingTasks}
                  className="flex-1 input-premium py-2.5 px-4 rounded-xl text-sm disabled:opacity-50"
                />
                <button 
                  type="submit" 
                  disabled={isGeneratingTasks}
                  className="btn-gradient px-4 rounded-xl text-sm font-bold disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {isGeneratingTasks ? 'Generating...' : 'Generate'}
                </button>
              </form>

              <AnimatePresence initial={false}>
                {taskIdeas.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    {taskIdeas.map((idea) => (
                      <motion.div
                        key={idea}
                        whileHover={{ y: -2 }}
                        className="rounded-2xl bg-white/80 border border-black/10 shadow-sm"
                      >
                        <Link 
                          to="/ai-tutor" 
                          state={{ topic: idea }}
                          className="block p-4 h-full rounded-2xl hover:bg-white/90 transition-colors"
                        >
                          <p className="text-sm text-text leading-relaxed">{idea}</p>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-[10px] uppercase tracking-widest font-semibold text-text-muted">Suggestion</span>
                            <span className="text-xs text-primary font-semibold inline-flex items-center gap-1">
                              Open <ArrowRight size={14} />
                            </span>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </TiltCard>

          <TiltCard glowColor="rgba(15,23,42,0.06)" floatDelay={1.0}>
            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="text-base font-bold text-text mb-4 flex items-center gap-2">
                <FiClock className="text-primary" size={16} />
                Activity Timeline
              </h3>
              {timelineEvents.length === 0 && recentNotes.length === 0 ? (
                <div className="text-center py-10 text-text-muted">
                  <FiClock size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium text-sm">No activity yet — start by uploading notes!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(timelineEvents.length > 0
                    ? timelineEvents.slice(0, 8).map((ev) => ({
                      kind: 'event',
                      id: ev.id,
                      title: ev.event_type?.replaceAll?.('_', ' ') || 'Event',
                      time: ev.occurred_at,
                      badge: 'bg-primary/10 text-primary border border-primary/25',
                      detail: typeof ev.payload === 'object' ? ev.payload?.title || ev.payload?.url || '' : '',
                    }))
                    : recentNotes.map((tx, i) => ({
                      kind: 'tx',
                      id: `tx-${i}`,
                      title: tx.reason,
                      time: tx.created_at,
                      badge: tx.credits_added > 0
                        ? 'bg-success/12 text-success border border-success/25'
                        : 'bg-danger/12 text-danger border border-danger/25',
                      detail: tx.credits_added > 0 ? `+${tx.credits_added} credits` : `-${tx.credits_used} credits`,
                    }))
                  ).map((row, i) => (
                    <motion.div
                      key={row.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.06 * i }}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-white/70 border border-black/10 hover:bg-white/90 hover:border-black/15 transition-all duration-300"
                    >
                      <div className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${row.badge}`}>
                        {row.kind === 'event' ? 'Event' : 'Credits'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text truncate">{row.title}</p>
                        {row.detail ? (
                          <p className="text-[11px] text-text-muted mt-1 truncate">{row.detail}</p>
                        ) : null}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-text-muted uppercase tracking-widest font-semibold">When</p>
                        <p className="text-xs font-semibold text-text tabular-nums mt-1">
                          {new Date(row.time).toLocaleString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </TiltCard>
        </div>

        <div className="lg:col-span-5 space-y-6">
          {upcomingSessions.length > 0 && (
            <TiltCard glowColor="rgba(14,165,233,0.10)" floatDelay={0.55}>
              <div className="glass-panel p-6 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-text flex items-center gap-2">
                      <Calendar size={16} className="text-primary" />
                      Upcoming Sessions
                    </h3>
                    <p className="text-xs text-text-muted mt-1">Auto-saved from your learning tools.</p>
                  </div>
                  <Link to="/profile" className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1">
                    View all <ArrowRight size={14} />
                  </Link>
                </div>

                <div className="mt-4 space-y-2">
                  {upcomingSessions.slice(0, 5).map((s) => (
                    <div
                      key={s.id}
                      className="p-4 rounded-2xl bg-white/80 border border-black/10 hover:bg-white/90 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-text truncate">{s.title}</p>
                          {s.description && (
                            <p className="text-[11px] text-text-muted mt-1 line-clamp-2">{s.description}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] uppercase tracking-widest font-semibold text-text-muted">Starts</p>
                          <p className="text-xs font-semibold text-text tabular-nums mt-1">
                            {new Date(s.starts_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TiltCard>
          )}

          <TiltCard glowColor="rgba(239,68,68,0.10)" floatDelay={0.65}>
            <div className="glass-panel p-6 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-text">3D Knowledge Graph</h3>
                  <p className="text-xs text-text-muted mt-1">A digital map of your learning connections.</p>
                </div>
                <Link to="/knowledge-graph" className="text-[10px] uppercase tracking-widest font-semibold text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors rounded-full px-3 py-1 shadow-sm flex items-center gap-1">
                  Expand Graph ↗
                </Link>
              </div>

              <div className="mt-4 h-[220px] rounded-2xl overflow-hidden border border-black/10 bg-white/70 relative">
                <div className="absolute inset-0 opacity-[0.92]">
                  <DigitalGraph3D
                    graph={conceptGraph?.graph}
                    nodeCount={78}
                    linksPerNode={3}
                    maxLinkDistance={0.75}
                    spread={1.15}
                    pointSize={30}
                    wobble={0.24}
                    speed={0.85}
                    cameraDistance={4.25}
                    palette={['#7c3aed', '#f59e0b', '#3b82f6']}
                    pixelRatio={1}
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-white/70 via-transparent to-white/30 pointer-events-none" />
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-text-muted">
                  Tip: Upload notes to grow your graph over time.
                </p>
                <Link to="/upload" className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1">
                  Add nodes <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </TiltCard>

          <TiltCard glowColor="rgba(15,23,42,0.06)" floatDelay={0.8}>
            <div className="glass-panel p-6 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-text">Workspace Snapshot</h3>
                  <p className="text-xs text-text-muted mt-1">A calm place to focus and ship.</p>
                </div>
                <div className="inline-flex items-center gap-2 text-xs text-text-muted bg-white/80 border border-black/10 rounded-full px-3 py-1 shadow-sm">
                  <Calendar size={14} className="text-primary" />
                  Today
                </div>
              </div>

              <div className="mt-4 rounded-2xl overflow-hidden border border-black/10 bg-white/70">
                <img
                  src={workspaceSnapshotIllustration}
                  alt="Cartoon illustration of study workspace"
                  className="w-full h-[180px] object-cover"
                  loading="lazy"
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-white/80 border border-black/10">
                  <p className="text-xs text-text-muted font-semibold uppercase tracking-widest">Pinned</p>
                  <p className="mt-2 text-2xl font-black text-text tabular-nums">{pinned.length}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/80 border border-black/10">
                  <p className="text-xs text-text-muted font-semibold uppercase tracking-widest">Credits</p>
                  <p className="mt-2 text-2xl font-black text-text tabular-nums">{user?.credits || 0}</p>
                </div>
              </div>
            </div>
          </TiltCard>

          <TiltCard glowColor="rgba(15,23,42,0.06)" floatDelay={1.05}>
            <div className="glass-panel p-6 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-text">Collaboration</h3>
                  <p className="text-xs text-text-muted mt-1">Jump into rooms and keep momentum.</p>
                </div>
                <Link to="/nexus-board" className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1">
                  Open Nexus Board <ArrowRight size={14} />
                </Link>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl overflow-hidden border border-black/10 bg-white/70">
                  <img
                    src={collaborationWhiteboardIllustration}
                    alt="Cartoon illustration of whiteboard collaboration"
                    className="w-full h-[120px] object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="rounded-2xl overflow-hidden border border-black/10 bg-white/70">
                  <img
                    src={collaborationChatIllustration}
                    alt="Cartoon illustration of chat and tasks"
                    className="w-full h-[120px] object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </TiltCard>
        </div>
      </motion.div>

      {chartData && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TiltCard glowColor="rgba(139,92,246,0.12)" floatDelay={0.5}>
            <div className="glass-panel p-6 rounded-2xl flex flex-col h-80 relative overflow-hidden">
              <h2 className="text-base font-bold text-text mb-5 flex items-center gap-2 relative z-10">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Upload Velocity (7 Days)
              </h2>
              <div className="flex-1 min-h-0 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData.uploadsData}>
                    <defs>
                      <linearGradient id="colorUploads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
                    <XAxis dataKey="date" stroke="rgba(15,23,42,0.45)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(15,23,42,0.45)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="uploads" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorUploads)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TiltCard>

          <TiltCard glowColor="rgba(236,72,153,0.12)" floatDelay={1}>
            <div className="glass-panel p-6 rounded-2xl flex flex-col h-80 relative overflow-hidden">
              <h2 className="text-base font-bold text-text mb-5 flex items-center gap-2 relative z-10">
                <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                User Registrations (7 Days)
              </h2>
              <div className="flex-1 min-h-0 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.usersData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
                    <XAxis dataKey="date" stroke="rgba(15,23,42,0.45)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(15,23,42,0.45)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="users" fill="#f97316" radius={[8, 8, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TiltCard>
        </motion.div>
      )}

    </motion.div>
  );
};

export default DashboardPage;
