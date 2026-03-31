import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { FiHome, FiCompass, FiUpload, FiUser, FiShield, FiLogOut, FiChevronRight, FiChevronDown, FiBook, FiLayers, FiGrid, FiBookOpen, FiMenu, FiX } from 'react-icons/fi';

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

  useEffect(() => {
    fetchDegrees();
  }, []);

  const fetchDegrees = async () => {
    try {
      const res = await api.get('/degrees');
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
        const res = await api.get(`/degrees/${degreeId}/branches`);
        setBranches(prev => ({ ...prev, [degreeId]: res.data }));
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
        const res = await api.get(`/branches/${branchId}/semesters`);
        setSemesters(prev => ({ ...prev, [branchId]: res.data }));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const navItems = [
    { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { path: '/explorer', icon: FiCompass, label: 'Explorer' },
    { path: '/upload', icon: FiUpload, label: 'Upload' },
    { path: '/profile', icon: FiUser, label: 'Profile' },
  ];

  if (user?.role === 'admin' || user?.role === 'superadmin') {
    navItems.push({ path: '/admin', icon: FiShield, label: 'Admin Panel' });
  }

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-surface text-text md:hidden"
      >
        {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full z-40 transition-all duration-300 flex flex-col
        ${collapsed ? 'w-20' : 'w-72'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        bg-surface/90 backdrop-blur-xl border-r border-white/5`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-white text-lg shrink-0">
            L
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold gradient-text">Learnexus</h1>
              <p className="text-[10px] text-text-muted uppercase tracking-widest">Knowledge System</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto hidden md:block text-text-muted hover:text-text transition-colors"
          >
            <FiChevronRight className={`transition-transform ${collapsed ? '' : 'rotate-180'}`} />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive(item.path)
                    ? 'bg-primary/15 text-primary shadow-sm shadow-primary/10'
                    : 'text-text-muted hover:text-text hover:bg-white/5'
                  }`}
              >
                <item.icon size={18} className="shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </div>

          {/* Academic Tree */}
          {!collapsed && (
            <div className="mt-6">
              <p className="text-[10px] uppercase tracking-widest text-text-muted px-3 mb-3 font-semibold">Academic Explorer</p>
              <div className="space-y-1">
                {degrees.map((degree) => (
                  <div key={degree.id}>
                    <button
                      onClick={() => toggleDegree(degree.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-muted hover:text-text hover:bg-white/5 transition-all"
                    >
                      <FiBook size={14} className="shrink-0 text-primary" />
                      <span className="truncate flex-1 text-left">{degree.name}</span>
                      {expandedDegree === degree.id ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
                    </button>

                    {expandedDegree === degree.id && branches[degree.id] && (
                      <div className="ml-4 pl-3 border-l border-white/5 space-y-1 mt-1">
                        {branches[degree.id].map((branch) => (
                          <div key={branch.id}>
                            <button
                              onClick={() => toggleBranch(branch.id)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-text-muted hover:text-text hover:bg-white/5 transition-all"
                            >
                              <FiLayers size={12} className="shrink-0 text-accent" />
                              <span className="truncate flex-1 text-left">{branch.name}</span>
                              {expandedBranch === branch.id ? <FiChevronDown size={10} /> : <FiChevronRight size={10} />}
                            </button>

                            {expandedBranch === branch.id && semesters[branch.id] && (
                              <div className="ml-3 pl-3 border-l border-white/5 space-y-1 mt-1">
                                {semesters[branch.id].map((sem) => (
                                  <button
                                    key={sem.id}
                                    onClick={() => {
                                      navigate(`/explorer?semester=${sem.id}`);
                                      setMobileOpen(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-text-muted hover:text-text hover:bg-white/5 transition-all"
                                  >
                                    <FiGrid size={10} className="shrink-0 text-success" />
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

        {/* User + Logout */}
        <div className="border-t border-white/5 p-4">
          {!collapsed && user && (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold text-sm">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text truncate">{user.name}</p>
                <p className="text-[10px] text-text-muted">⚡ {user.credits} credits</p>
              </div>
            </div>
          )}
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-danger hover:bg-danger/10 transition-all"
          >
            <FiLogOut size={16} className="shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
