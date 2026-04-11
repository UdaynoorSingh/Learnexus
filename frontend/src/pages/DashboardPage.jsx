import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { FiBook, FiFileText, FiTrendingUp, FiZap, FiUpload, FiCompass, FiClock } from 'react-icons/fi';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
    <div className="space-y-8 animate-fadeInUp">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text">
            Welcome back, <span className="gradient-text">{user?.name}</span>
          </h1>
          <p className="text-text-muted mt-1">Here's your learning overview</p>
        </div>
        <div className="flex gap-3">
          <Link to="/upload" className="btn-gradient flex items-center gap-2 text-sm px-5 py-2.5 rounded-xl text-white font-medium">
            <FiUpload size={16} /> Upload Notes
          </Link>
          <Link to="/explorer" className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-text hover:bg-white/5 text-sm font-medium transition-all">
            <FiCompass size={16} /> Explore
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <div key={i} className="glass-card p-5 hover:border-white/20 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon size={20} className={stat.color} />
              </div>
              <span className="text-2xl font-bold text-text">{stat.value}</span>
            </div>
            <p className="text-sm font-medium text-text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {chartData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-6 flex flex-col h-80">
            <h2 className="text-lg font-semibold text-text mb-6">Upload Velocity (7 Days)</h2>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.uploadsData}>
                  <defs>
                    <linearGradient id="colorUploads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="uploads" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorUploads)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-6 flex flex-col h-80">
            <h2 className="text-lg font-semibold text-text mb-6">User Registrations (7 Days)</h2>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.usersData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="users" fill="#ec4899" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-text mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link to="/explorer" className="p-5 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 hover:scale-[1.02] transition-all text-center group">
              <FiCompass size={28} className="mx-auto text-primary mb-3" />
              <p className="text-sm font-bold text-primary">Browse Topics</p>
            </Link>
            <Link to="/upload" className="p-5 rounded-xl bg-accent/10 border border-accent/20 hover:bg-accent/20 hover:scale-[1.02] transition-all text-center group">
              <FiUpload size={28} className="mx-auto text-accent mb-3" />
              <p className="text-sm font-bold text-accent">Upload Notes</p>
            </Link>
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col h-64">
          <h2 className="text-lg font-semibold text-text mb-4">Your Recent Activity</h2>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {recentNotes.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                <FiClock size={32} className="mx-auto mb-3 opacity-50" />
                <p>No recent activity yet.</p>
              </div>
            ) : (
              recentNotes.map((tx, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-white/5 hover:border-white/10 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                    tx.credits_added > 0 ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                  }`}>
                    {tx.credits_added > 0 ? `+${tx.credits_added}` : `-${tx.credits_used}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{tx.reason}</p>
                    <p className="text-xs text-text-muted mt-0.5">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
