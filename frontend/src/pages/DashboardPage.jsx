import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  FiBook, FiFileText, FiTrendingUp, FiZap, FiUpload, FiCompass, FiClock,
  FiPlay, FiMessageSquare, FiAward, FiBookOpen, FiGlobe, FiYoutube,
} from 'react-icons/fi';
import { GraduationCap, Library, Trophy, Sparkles } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import GradientText from '../components/reactbits/GradientText';
import Particles from '../components/reactbits/Particles';
import SplitText from '../components/reactbits/SplitText';

/* ── Animation constants ── */
const spring = { type: 'spring', stiffness: 420, damping: 32 };
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 350, damping: 25 } }
};

/* ── Antigravity float keyframes (different delays = organic drift) ── */
const floatVariants = (delay = 0) => ({
  animate: {
    y: [0, -8, 0, -4, 0],
    transition: { duration: 6, ease: 'easeInOut', repeat: Infinity, delay }
  }
});

/* ═══════════════════════════════════════════════════════════
   TiltCard — Physics-based 3D hover tilt via mouse position
   ═══════════════════════════════════════════════════════════ */
const TiltCard = ({ children, className = '', glowColor = 'rgba(14,165,233,0.15)', floatDelay = 0 }) => {
  const ref = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 250, damping: 20 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), { stiffness: 250, damping: 20 });
  const scale = useSpring(1, { stiffness: 300, damping: 25 });

  const handleMouse = (e) => {
    const rect = ref.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseEnter={() => scale.set(1.03)}
      onMouseLeave={() => { mx.set(0); my.set(0); scale.set(1); }}
      style={{ rotateX, rotateY, scale, transformStyle: 'preserve-3d', perspective: 800 }}
      variants={itemVariants}
      {...floatVariants(floatDelay)}
      className={`relative group cursor-default ${className}`}
    >
      {/* Hover glow */}
      <div
        className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl z-0 pointer-events-none"
        style={{ background: glowColor }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════
   DASHBOARD PAGE
   ═══════════════════════════════════════════════════════════ */
const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [recentNotes, setRecentNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading dashboard..." />;

  const statCards = [
    { label: 'Credits', value: user?.credits || 0, icon: FiZap, gradient: 'from-amber-500 to-orange-500', glow: 'rgba(245,158,11,0.2)' },
    { label: 'Total Topics', value: stats?.totalTopics || 0, icon: FiBook, gradient: 'from-primary to-cyan-400', glow: 'rgba(14,165,233,0.2)' },
    { label: 'Total Notes', value: stats?.totalNotes || 0, icon: FiFileText, gradient: 'from-accent to-fuchsia-400', glow: 'rgba(139,92,246,0.2)' },
    { label: 'Pending Review', value: stats?.pendingNotes || 0, icon: FiTrendingUp, gradient: 'from-emerald-500 to-green-400', glow: 'rgba(34,197,94,0.2)' },
  ];

  const quickActions = [
    { to: '/explorer', icon: FiCompass, label: 'Browse Topics', desc: 'Explore resources', gradient: 'from-primary/20 to-cyan-500/10', border: 'border-primary/25', text: 'text-primary' },
    { to: '/upload', icon: FiUpload, label: 'Upload Notes', desc: 'Earn credits', gradient: 'from-accent/20 to-fuchsia-500/10', border: 'border-accent/25', text: 'text-accent' },
    { to: '/video-learn', icon: FiYoutube, label: 'YouTube Learn', desc: 'Video lectures', gradient: 'from-red-500/20 to-pink-500/10', border: 'border-red-500/25', text: 'text-red-400' },
    { to: '/ai-tutor', icon: GraduationCap, label: 'AI Tutor', desc: 'Personal tutor', gradient: 'from-emerald-500/20 to-teal-500/10', border: 'border-emerald-500/25', text: 'text-emerald-400' },
    { to: '/nexus-board', icon: FiMessageSquare, label: 'Nexus Board', desc: 'Community hub', gradient: 'from-indigo-500/20 to-blue-500/10', border: 'border-indigo-500/25', text: 'text-indigo-400' },
    { to: '/nexus-library', icon: Library, label: 'Nexus Library', desc: 'Study material', gradient: 'from-amber-500/20 to-yellow-500/10', border: 'border-amber-500/25', text: 'text-amber-400' },
    { to: '/challenges', icon: Trophy, label: 'Challenges', desc: 'Compete & earn', gradient: 'from-pink-500/20 to-rose-500/10', border: 'border-pink-500/25', text: 'text-pink-400' },
    { to: '/profile', icon: FiAward, label: 'Profile', desc: 'Your journey', gradient: 'from-sky-500/20 to-cyan-500/10', border: 'border-sky-500/25', text: 'text-sky-400' },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface/95 backdrop-blur-xl border border-white/10 p-3 rounded-xl shadow-2xl shadow-black/50">
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
      {/* ══════ HERO SECTION ══════ */}
      <motion.div variants={itemVariants} className="relative rounded-3xl overflow-hidden min-h-[240px]">
        {/* Particles background */}
        <div className="absolute inset-0 z-0">
          <Particles
            particleCount={120}
            particleSpread={12}
            speed={0.08}
            particleColors={['#0ea5e9', '#8b5cf6', '#ec4899', '#22c55e']}
            moveParticlesOnHover={true}
            particleHoverFactor={1.5}
            alphaParticles={true}
            particleBaseSize={80}
            sizeRandomness={0.8}
            cameraDistance={22}
          />
        </div>

        {/* Glass overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-transparent backdrop-blur-[2px] z-[1]" />

        {/* Content */}
        <div className="relative z-[2] p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <GradientText
                colors={['#0ea5e9', '#8b5cf6', '#ec4899', '#22c55e', '#0ea5e9']}
                animationSpeed={6}
                showBorder={true}
                className="px-1 py-0.5"
              >
                <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles size={12} /> Smart Resource Hub
                </span>
              </GradientText>
            </div>

            <SplitText
              text={`Welcome back, ${user?.name || 'Student'}`}
              className="text-4xl md:text-5xl font-black text-text tracking-tight leading-tight"
              delay={35}
              duration={0.5}
              splitType="words"
              from={{ opacity: 0, y: 30, rotateX: -40 }}
              to={{ opacity: 1, y: 0, rotateX: 0 }}
              tag="h1"
            />

            <motion.p
              className="text-text-muted text-lg mt-3 max-w-lg"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              Your personalized learning command center. All resources,{' '}
              <span className="text-primary font-medium">one platform</span>.
            </motion.p>
          </div>

          <motion.div
            className="flex gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Link to="/upload" className="btn-gradient py-3 px-7 rounded-2xl flex items-center gap-2.5 text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
              <FiUpload size={18} /> Upload Notes
            </Link>
            <Link to="/explorer" className="flex items-center gap-2.5 px-7 py-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/15 hover:bg-white/10 hover:border-white/25 text-sm font-bold text-text transition-all">
              <FiCompass size={18} /> Explore
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* ══════ STAT CARDS — floating ══════ */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, i) => (
          <TiltCard key={i} glowColor={stat.glow} floatDelay={i * 0.8}>
            <div className="glass-panel p-6 rounded-2xl h-full relative overflow-hidden">
              {/* Gradient orb */}
              <div className={`absolute -top-8 -right-8 w-28 h-28 rounded-full bg-gradient-to-br ${stat.gradient} opacity-20 blur-2xl group-hover:opacity-40 transition-opacity duration-500`} />

              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.gradient} shadow-lg flex items-center justify-center`}>
                  <stat.icon size={22} className="text-white" />
                </div>
                <motion.span
                  className="text-4xl font-black text-text tracking-tight tabular-nums"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ ...spring, delay: 0.3 + i * 0.1 }}
                >
                  {stat.value}
                </motion.span>
              </div>
              <p className="text-xs font-bold text-text-muted uppercase tracking-widest relative z-10">{stat.label}</p>
            </div>
          </TiltCard>
        ))}
      </motion.div>

      {/* ══════ QUICK ACTIONS GRID — floating ══════ */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
          <FiGlobe className="text-primary" size={18} />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {quickActions.map((action, i) => (
            <TiltCard key={i} glowColor="rgba(255,255,255,0.05)" floatDelay={i * 0.4}>
              <Link
                to={action.to}
                className={`block p-5 rounded-2xl bg-gradient-to-br ${action.gradient} border ${action.border} h-full
                  hover:shadow-xl transition-all duration-300 group/action`}
              >
                <action.icon size={28} className={`${action.text} mb-3 group-hover/action:scale-110 transition-transform duration-300`} />
                <p className={`text-sm font-bold ${action.text} tracking-wide`}>{action.label}</p>
                <p className="text-[11px] text-text-muted mt-1">{action.desc}</p>
              </Link>
            </TiltCard>
          ))}
        </div>
      </motion.div>

      {/* ══════ CHARTS — floating ══════ */}
      {chartData && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TiltCard glowColor="rgba(139,92,246,0.12)" floatDelay={0.5}>
            <div className="glass-panel p-6 rounded-2xl flex flex-col h-80 relative overflow-hidden">
              <h2 className="text-base font-bold text-text mb-5 flex items-center gap-2 relative z-10">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                Upload Velocity (7 Days)
              </h2>
              <div className="flex-1 min-h-0 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData.uploadsData}>
                    <defs>
                      <linearGradient id="colorUploads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="date" stroke="#525252" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#525252" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="uploads" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorUploads)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TiltCard>

          <TiltCard glowColor="rgba(236,72,153,0.12)" floatDelay={1}>
            <div className="glass-panel p-6 rounded-2xl flex flex-col h-80 relative overflow-hidden">
              <h2 className="text-base font-bold text-text mb-5 flex items-center gap-2 relative z-10">
                <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                User Registrations (7 Days)
              </h2>
              <div className="flex-1 min-h-0 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.usersData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="date" stroke="#525252" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#525252" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="users" fill="#ec4899" radius={[8, 8, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TiltCard>
        </motion.div>
      )}

      {/* ══════ RECENT ACTIVITY — floating ══════ */}
      <motion.div variants={itemVariants}>
        <TiltCard glowColor="rgba(14,165,233,0.08)" floatDelay={1.5}>
          <div className="glass-panel p-6 rounded-2xl">
            <h2 className="text-base font-bold text-text mb-5 flex items-center gap-2">
              <FiClock className="text-primary" size={16} />
              Recent Activity
            </h2>
            {recentNotes.length === 0 ? (
              <div className="text-center py-10 text-text-muted">
                <FiClock size={36} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium text-sm">No activity yet — start by uploading notes!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentNotes.map((tx, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5
                      hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 group/tx"
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black shadow-lg shrink-0 ${tx.credits_added > 0
                        ? 'bg-success/15 text-success border border-success/20'
                        : 'bg-danger/15 text-danger border border-danger/20'
                      }`}>
                      {tx.credits_added > 0 ? `+${tx.credits_added}` : `-${tx.credits_used}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text truncate">{tx.reason}</p>
                      <p className="text-[10px] text-text-muted mt-1 uppercase tracking-widest font-medium">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </TiltCard>
      </motion.div>
    </motion.div>
  );
};

export default DashboardPage;
