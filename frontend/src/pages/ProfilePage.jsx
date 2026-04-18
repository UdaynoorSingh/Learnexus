import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageMascot from '../components/ui/PageMascot';
import PageHeader from '../components/layout/PageHeader';
import {
  FiMail,
  FiShield,
  FiZap,
  FiTrendingUp,
  FiTrendingDown,
  FiClock,
  FiBookmark
} from 'react-icons/fi';

const ProfilePage = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const txRes = await api.get('/credits/history');
        if (!cancelled) setTransactions(txRes.data);
      } catch (err) {
        console.error(err);
        if (!cancelled) setTransactions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <LoadingSpinner size="lg" text="Loading profile..." />;

  const totalEarned = transactions.reduce((sum, t) => sum + (t.credits_added || 0), 0);
  const totalSpent = transactions.reduce((sum, t) => sum + (t.credits_used || 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeInUp">
      <PageHeader
        eyebrow="Account"
        title="My Profile"
        description="Credits balance, role, and recent credit activity."
      >
        <PageMascot role="profile" size="sm" hideOnMobile />
      </PageHeader>

      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-3xl font-bold text-white">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-text">{user?.name}</h2>
              <p className="text-sm text-text-muted flex items-center gap-2 mt-1">
                <FiMail size={14} /> {user?.email}
              </p>
              <p className="text-sm text-text-muted flex items-center gap-2 mt-0.5">
                <FiShield size={14} />
                <span className="capitalize px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs">
                  {user?.role}
                </span>
              </p>
            </div>
          </div>
          <Link
            to="/bookmarks"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold bg-accent/20 text-accent border border-accent/35 hover:bg-accent/30 hover:border-accent/50 transition-colors shrink-0"
          >
            <FiBookmark size={18} />
            Bookmarked posts
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 text-center">
          <FiZap size={24} className="mx-auto text-warning mb-2" />
          <p className="text-2xl font-bold text-text">{user?.credits}</p>
          <p className="text-xs text-text-muted">Current Balance</p>
        </div>
        <div className="glass-card p-5 text-center">
          <FiTrendingUp size={24} className="mx-auto text-success mb-2" />
          <p className="text-2xl font-bold text-success">+{totalEarned}</p>
          <p className="text-xs text-text-muted">Total Earned</p>
        </div>
        <div className="glass-card p-5 text-center">
          <FiTrendingDown size={24} className="mx-auto text-danger mb-2" />
          <p className="text-2xl font-bold text-danger">-{totalSpent}</p>
          <p className="text-xs text-text-muted">Total Spent</p>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-slate-900 font-['Outfit'] tracking-tight mb-1">Transaction history</h3>
        <p className="text-xs text-slate-500 mb-5">Uploads, AI tools, and challenges that moved your balance.</p>
        {transactions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200/90 bg-slate-50/60 py-10 text-center text-slate-600">
            <FiClock size={32} className="mx-auto mb-2 text-slate-400" aria-hidden />
            <p className="text-sm font-medium">No transactions yet</p>
            <p className="mt-1 text-xs text-slate-500">Earn credits by uploading notes or complete challenges.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-3 rounded-xl bg-white/60 border border-black/10 hover:border-black/20 transition-all"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0
                  ${tx.credits_added > 0 ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}
                >
                  {tx.credits_added > 0 ? `+${tx.credits_added}` : `-${tx.credits_used}`}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text truncate">{tx.reason}</p>
                  <p className="text-xs text-text-muted">{new Date(tx.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
