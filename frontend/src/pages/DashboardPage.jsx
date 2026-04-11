import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { FiBook, FiFileText, FiTrendingUp, FiZap, FiUpload, FiCompass, FiClock } from 'react-icons/fi';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 25 } }
};

const hoverCard = {
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.02, y: -4, transition: { type: "spring", stiffness: 400, damping: 25 } }
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [recentNotes, setRecentNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
    { label: 'Credits', value: user?.credits || 0, icon: FiZap, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { label: 'Total Topics', value: stats?.totalTopics || 0, icon: FiBook, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Total Notes', value: stats?.totalNotes || 0, icon: FiFileText, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Pending Review', value: stats?.pendingNotes || 0, icon: FiTrendingUp, color: 'text-success', bg: 'bg-success/10' },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface/90 backdrop-blur-md border border-white/10 p-3 rounded-lg shadow-xl">
          <p className="text-text font-bold mb-1">{label}</p>
          <p className="text-primary text-sm font-medium">Count: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-text tracking-tight">
            Welcome back, <span className="gradient-text">{user?.name}</span>
          </h1>
          <p className="text-text-muted mt-2 text-lg">Here's your advanced learning overview</p>
        </div>
        <div className="flex gap-3">
          <Link to="/upload" className="btn-ai-primary flex items-center gap-2 text-sm px-6 py-3 rounded-xl font-bold">
            <FiUpload size={18} /> Upload Notes
          </Link>
          <Link to="/explorer" className="flex items-center gap-2 px-6 py-3 rounded-xl btn-secondary-outline text-sm font-bold">
            <FiCompass size={18} /> Explore
          </Link>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <motion.div 
            key={i} 
            variants={hoverCard} 
            initial="rest" 
            whileHover="hover" 
            className="glass-panel p-6 group cursor-default relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full -mr-10 -mt-10 transition-transform duration-500 group-hover:scale-110" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className={`w-12 h-12 rounded-2xl ${stat.bg} shadow-lg flex items-center justify-center`}>
                <stat.icon size={24} className={stat.color} />
              </div>
              <span className="text-3xl font-black text-text tracking-tight">{stat.value}</span>
            </div>
            <p className="text-sm font-semibold text-text-muted uppercase tracking-wider relative z-10">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {chartData && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div variants={hoverCard} initial="rest" whileHover="hover" className="glass-panel p-6 flex flex-col h-80 relative overflow-hidden group">
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl z-0" />
            <h2 className="text-lg font-bold text-text mb-6 relative z-10">Upload Velocity (7 Days)</h2>
            <div className="flex-1 min-h-0 relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.uploadsData}>
                  <defs>
                    <linearGradient id="colorUploads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="uploads" stroke="#8b5cf6" strokeWidth={4} fillOpacity={1} fill="url(#colorUploads)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div variants={hoverCard} initial="rest" whileHover="hover" className="glass-panel p-6 flex flex-col h-80 relative overflow-hidden group">
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl z-0" />
            <h2 className="text-lg font-bold text-text mb-6 relative z-10">User Registrations (7 Days)</h2>
            <div className="flex-1 min-h-0 relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.usersData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="users" fill="#ec4899" radius={[6, 6, 0, 0]} barSize={34} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={hoverCard} initial="rest" whileHover="hover" className="glass-panel p-6">
          <h2 className="text-lg font-bold text-text mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link to="/explorer" className="p-6 rounded-2xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all text-center group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <FiCompass size={32} className="mx-auto text-primary mb-4 transform group-hover:scale-110 transition-transform" />
              <p className="text-sm font-bold text-primary tracking-wide">Browse Topics</p>
            </Link>
            <Link to="/upload" className="p-6 rounded-2xl bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-all text-center group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <FiUpload size={32} className="mx-auto text-accent mb-4 transform group-hover:scale-110 transition-transform" />
              <p className="text-sm font-bold text-accent tracking-wide">Upload Notes</p>
            </Link>
          </div>
        </motion.div>

        <motion.div variants={hoverCard} initial="rest" whileHover="hover" className="glass-panel p-6 flex flex-col h-64">
          <h2 className="text-lg font-bold text-text mb-4">Your Recent Activity</h2>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {recentNotes.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                <FiClock size={36} className="mx-auto mb-3 opacity-40" />
                <p className="font-medium">No recent activity yet.</p>
              </div>
            ) : (
              recentNotes.map((tx, i) => (
                <div key={i} className="flex items-center gap-4 p-3.5 rounded-xl bg-background/60 border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black shadow-lg ${
                    tx.credits_added > 0 ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                  }`}>
                    {tx.credits_added > 0 ? `+${tx.credits_added}` : `-${tx.credits_used}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text truncate">{tx.reason}</p>
                    <p className="text-[11px] text-text-muted mt-1 uppercase tracking-wider font-semibold">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default DashboardPage;
