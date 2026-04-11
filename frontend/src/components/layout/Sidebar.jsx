import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  Compass,
  Upload,
  User,
  Shield,
  LogOut,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Layers,
  LayoutGrid,
  Menu,
  X,
  PlaySquare,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { academicCatalogParams } from '../../utils/academicCatalog';

const MotionLink = motion(Link);

const springNav = { type: 'spring', stiffness: 420, damping: 32 };

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [degrees, setDegrees] = useState([]);
  const [expandedDegree, setExpandedDegree] = useState(null);
  const [branches, setBranches] = useState({});
  const [expandedBranch, setExpandedBranch] = useState(null);
  const [semesters, setSemesters] = useState({});
  const [trendingRooms, setTrendingRooms] = useState([]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const applyOffset = () => {
      if (!mq.matches) {
        document.documentElement.style.setProperty('--sidebar-offset', '0');
        return;
      }
      document.documentElement.style.setProperty('--sidebar-offset', collapsed ? '7.25rem' : '21rem');
    };
    applyOffset();
    mq.addEventListener('change', applyOffset);
    return () => mq.removeEventListener('change', applyOffset);
  }, [collapsed]);

  useEffect(() => {
    if (!user) return;
    fetchDegrees();
  }, [user?.id, user?.college_id, user?.role]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/community/rooms');
        if (!cancelled && Array.isArray(res.data)) setTrendingRooms(res.data);
      } catch {
        if (!cancelled) setTrendingRooms([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchDegrees = async () => {
    try {
      const params = academicCatalogParams(user);
      const res = await api.get('/degrees', { params });
      setDegrees(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleDegree = async (degreeId) => {
    if (expandedDegree === degreeId) {
      setExpandedDegree(null);
      return;
    }
    setExpandedDegree(degreeId);
    if (!branches[degreeId]) {
      try {
        const res = await api.get(`/degrees/${degreeId}/branches`, {
          params: academicCatalogParams(user)
        });
        setBranches((prev) => ({ ...prev, [degreeId]: res.data }));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const toggleBranch = async (branchId) => {
    if (expandedBranch === branchId) {
      setExpandedBranch(null);
      return;
    }
    setExpandedBranch(branchId);
    if (!semesters[branchId]) {
      try {
        const res = await api.get(`/branches/${branchId}/semesters`, {
          params: academicCatalogParams(user)
        });
        setSemesters((prev) => ({ ...prev, [branchId]: res.data }));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/explorer', icon: Compass, label: 'Explorer' },
    { path: '/upload', icon: Upload, label: 'Upload' },
    { path: '/video-learn', icon: PlaySquare, label: 'YouTube Learn' },
    { path: '/nexus-board', icon: MessageSquare, label: 'Nexus Board' },
    { path: '/profile', icon: User, label: 'Profile' }
  ];

  if (user?.role === 'admin' || user?.role === 'superadmin') {
    navItems.push({ path: '/admin', icon: Shield, label: 'Admin Panel' });
  }

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 p-2.5 rounded-xl glass-float text-text md:hidden border border-white/10"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
      </button>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed z-40 flex flex-col transition-all duration-300 ease-out
          md:left-4 md:top-4 md:bottom-auto md:max-h-[calc(100vh-2rem)] md:h-[calc(100vh-2rem)]
          md:rounded-2xl md:glass-float md:border md:border-white/10
          left-0 top-0 bottom-0 h-full
          ${collapsed ? 'md:w-20' : 'md:w-72'}
          w-[min(20rem,100vw)]
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          bg-[#121212]/95 backdrop-blur-xl md:bg-transparent border-r border-white/10 md:border-r-0`}
      >
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10 shrink-0">
          <motion.div
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-white text-lg shrink-0 glow-ai"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={springNav}
          >
            L
          </motion.div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gradient-ai tracking-tight truncate">Learnexus</h1>
              <p className="text-[10px] text-text-muted uppercase tracking-widest font-medium">Knowledge OS</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto hidden md:flex p-2 rounded-lg text-text-muted hover:text-text hover:bg-white/5 transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronRight
              size={18}
              strokeWidth={2}
              className={`transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
            />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 min-h-0">
          <div className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <MotionLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={springNav}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                    ${
                      active
                        ? 'bg-primary/15 text-primary nav-active-glow border border-primary/25'
                        : 'text-text-muted hover:text-text hover:bg-white/5 border border-transparent'
                    }`}
                >
                  <item.icon size={18} strokeWidth={2} className="shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </MotionLink>
              );
            })}
          </div>

          {!collapsed && trendingRooms.length > 0 && (
            <div className="mt-6">
              <p className="text-[10px] uppercase tracking-widest text-text-muted px-3 mb-2 font-semibold">
                🔥 Trending Rooms
              </p>
              <div className="space-y-0.5">
                {trendingRooms.map((room) => (
                  <MotionLink
                    key={room.name}
                    to={`/nexus-board?tag=${encodeURIComponent(room.name)}`}
                    onClick={() => setMobileOpen(false)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={springNav}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-medium text-text-muted hover:text-accent hover:bg-accent/10 border border-transparent hover:border-accent/20"
                  >
                    <span className="truncate min-w-0">{room.name}</span>
                    <span className="text-[10px] font-bold text-accent/90 shrink-0 tabular-nums">
                      {room.post_count}
                    </span>
                  </MotionLink>
                ))}
              </div>
            </div>
          )}

          {!collapsed && (
            <div className="mt-6">
              <p className="text-[10px] uppercase tracking-widest text-text-muted px-3 mb-2 font-semibold">
                Academic Explorer
              </p>
              <div className="space-y-1">
                {degrees.map((degree) => (
                  <div key={degree.id}>
                    <button
                      type="button"
                      onClick={() => toggleDegree(degree.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-muted hover:text-text hover:bg-white/5 transition-all"
                    >
                      <BookOpen size={14} strokeWidth={2} className="shrink-0 text-primary" />
                      <span className="truncate flex-1 text-left">{degree.name}</span>
                      {expandedDegree === degree.id ? (
                        <ChevronDown size={12} strokeWidth={2} />
                      ) : (
                        <ChevronRight size={12} strokeWidth={2} />
                      )}
                    </button>

                    {expandedDegree === degree.id && branches[degree.id] && (
                      <div className="ml-3 pl-3 border-l border-white/10 space-y-1 mt-1">
                        {branches[degree.id].map((branch) => (
                          <div key={branch.id}>
                            <button
                              type="button"
                              onClick={() => toggleBranch(branch.id)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-text-muted hover:text-text hover:bg-white/5 transition-all"
                            >
                              <Layers size={12} strokeWidth={2} className="shrink-0 text-accent" />
                              <span className="truncate flex-1 text-left">{branch.name}</span>
                              {expandedBranch === branch.id ? (
                                <ChevronDown size={10} strokeWidth={2} />
                              ) : (
                                <ChevronRight size={10} strokeWidth={2} />
                              )}
                            </button>

                            {expandedBranch === branch.id && semesters[branch.id] && (
                              <div className="ml-2 pl-2 border-l border-white/10 space-y-1 mt-1">
                                {semesters[branch.id].map((sem) => (
                                  <button
                                    key={sem.id}
                                    type="button"
                                    onClick={() => {
                                      navigate(`/explorer?semester=${sem.id}`);
                                      setMobileOpen(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-text-muted hover:text-text hover:bg-white/5 transition-all"
                                  >
                                    <LayoutGrid size={10} strokeWidth={2} className="shrink-0 text-success" />
                                    <span>Semester {sem.number}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="border-t border-white/10 p-3 shrink-0">
          {!collapsed && user && (
            <div className="flex items-center gap-3 mb-2 px-1">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-primary/20">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text truncate tracking-tight">{user.name}</p>
                <p className="text-[10px] text-text-muted tabular-nums">⚡ {user.credits} credits</p>
              </div>
            </div>
          )}
          <motion.button
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={springNav}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-danger hover:bg-danger/10 transition-colors border border-transparent hover:border-danger/20"
          >
            <LogOut size={16} strokeWidth={2} className="shrink-0" />
            {!collapsed && <span>Logout</span>}
          </motion.button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
