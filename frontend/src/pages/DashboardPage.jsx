import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { FiBook, FiFileText, FiTrendingUp, FiZap, FiUpload, FiCompass, FiClock } from 'react-icons/fi';

const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentNotes, setRecentNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Try to get admin stats, fallback to general data
      try {
        const statsRes = await api.get('/admin/stats');
        setStats(statsRes.data);
      } catch {
        setStats({ totalUsers: 0, totalNotes: 0, totalTopics: 0, pendingNotes: 0 });
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
    { label: 'Credits', value: user?.credits || 0, icon: FiZap, color: 'from-yellow-500 to-orange-500', bg: 'bg-yellow-500/10' },
    { label: 'Total Topics', value: stats?.totalTopics || 0, icon: FiBook, color: 'from-primary to-blue-400', bg: 'bg-primary/10' },
    { label: 'Total Notes', value: stats?.totalNotes || 0, icon: FiFileText, color: 'from-accent to-purple-400', bg: 'bg-accent/10' },
    { label: 'Pending Review', value: stats?.pendingNotes || 0, icon: FiTrendingUp, color: 'from-success to-emerald-400', bg: 'bg-success/10' },
  ];

  return (
    <div className="space-y-8 animate-fadeInUp">
      {/* Welcome */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text">
            Welcome back, <span className="gradient-text">{user?.name}</span>
          </h1>
          <p className="text-text-muted mt-1">Here's your learning overview</p>
        </div>
        <div className="flex gap-3">
          <Link to="/upload" className="btn-gradient flex items-center gap-2 text-sm">
            <FiUpload size={16} /> Upload Notes
          </Link>
          <Link to="/explorer" className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-text hover:bg-white/5 text-sm font-medium transition-all">
            <FiCompass size={16} /> Explore
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <div key={i} className="glass-card p-5 glass-card-hover transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon size={20} className={`bg-gradient-to-r ${stat.color} bg-clip-text`} style={{ color: 'inherit' }} />
              </div>
              <span className="text-2xl font-bold text-text">{stat.value}</span>
            </div>
            <p className="text-sm text-text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-text mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/explorer" className="p-4 rounded-xl bg-primary/10 border border-primary/20 hover:border-primary/40 transition-all text-center group">
              <FiCompass size={24} className="mx-auto text-primary mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-text">Browse Topics</p>
            </Link>
            <Link to="/upload" className="p-4 rounded-xl bg-accent/10 border border-accent/20 hover:border-accent/40 transition-all text-center group">
              <FiUpload size={24} className="mx-auto text-accent mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-text">Upload Notes</p>
            </Link>
            <Link to="/profile" className="p-4 rounded-xl bg-success/10 border border-success/20 hover:border-success/40 transition-all text-center group">
              <FiZap size={24} className="mx-auto text-success mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-text">My Credits</p>
            </Link>
            <Link to="/explorer" className="p-4 rounded-xl bg-warning/10 border border-warning/20 hover:border-warning/40 transition-all text-center group">
              <FiBook size={24} className="mx-auto text-warning mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-text">My Subjects</p>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-text mb-4">Recent Activity</h2>
          {recentNotes.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <FiClock size={32} className="mx-auto mb-3 opacity-50" />
              <p>No recent activity yet.</p>
              <p className="text-xs mt-1">Start exploring and uploading notes!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentNotes.map((tx, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-white/5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    tx.credits_added > 0 ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                  }`}>
                    {tx.credits_added > 0 ? `+${tx.credits_added}` : `-${tx.credits_used}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text truncate">{tx.reason}</p>
                    <p className="text-xs text-text-muted">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
