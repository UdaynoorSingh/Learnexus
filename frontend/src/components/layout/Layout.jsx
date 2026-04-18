import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { io } from 'socket.io-client';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { Loader2, CheckCircle2, XCircle, X, Search } from 'lucide-react';
import CommandPalette from '../ui/CommandPalette';
import AiTutorFab from '../ui/AiTutorFab';

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const socket = io(socketUrl, { autoConnect: false });

const pageTransition = {
  initial: { opacity: 0, y: 15, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.99 },
  transition: { type: 'spring', stiffness: 300, damping: 25, mass: 0.8 }
};

const Layout = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [toast, setToast] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    if (user) {
      socket.connect();
      socket.emit('join', user.id);

      const setTemporaryToast = (data) => {
        setToast(data);
        if (data.type === 'success' || data.type === 'error') {
          setTimeout(() => setToast(null), 5000);
        }
      };

      socket.on('ai-progress', (data) => setTemporaryToast({ type: 'progress', ...data }));
      socket.on('ai-success', (data) => setTemporaryToast({ type: 'success', ...data }));
      socket.on('ai-error', (data) => setTemporaryToast({ type: 'error', ...data }));

      return () => {
        socket.off('ai-progress');
        socket.off('ai-success');
        socket.off('ai-error');
        socket.disconnect();
      };
    }
  }, [user]);

  useEffect(() => {
    const handleGlobalToast = (e) => {
      const { type, message, step } = e.detail;
      setToast({ type, message, step });
      if (type === 'success' || type === 'error') {
        setTimeout(() => setToast(null), 8000);
      }
    };
    window.addEventListener('learnexus-toast', handleGlobalToast);
    return () => window.removeEventListener('learnexus-toast', handleGlobalToast);
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      const isK = (e.key || '').toLowerCase() === 'k';
      if ((e.ctrlKey || e.metaKey) && isK) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const commands = [
    { label: 'Dashboard', path: '/dashboard', hint: 'Overview and widgets', keywords: 'home overview' },
    { label: 'Upload notes', path: '/upload', hint: 'Earn credits with uploads', keywords: 'notes pdf image' },
    { label: 'Explore topics', path: '/explorer', hint: 'Browse catalog', keywords: 'subjects topics' },
    { label: 'YouTube Learn', path: '/video-learn', hint: 'Fast-learn from any video', keywords: 'youtube lecture transcript' },
    { label: 'AI Tutor', path: '/ai-tutor', hint: 'Roadmap, lectures, quizzes', keywords: 'roadmap course' },
    { label: 'Nexus Board', path: '/nexus-board', hint: 'Community Q&A rooms', keywords: 'community posts' },
    { label: 'Nexus Library', path: '/nexus-library', hint: 'Blogs + AI audio', keywords: 'library audio' },
    { label: 'Challenges', path: '/challenges', hint: 'Solve and earn credits', keywords: 'company tasks' },
    { label: 'Profile', path: '/profile', hint: 'Credits + history', keywords: 'account credits' },
    { label: 'Bookmarks', path: '/bookmarks', hint: 'Saved threads', keywords: 'saved' },
  ];

  return (
    <div className="relative z-10 flex min-h-screen overflow-x-hidden bg-transparent">
      <Sidebar />
      <main className="flex-1 min-h-screen min-w-0 w-0 md:pl-[var(--sidebar-offset,21rem)] transition-[padding] duration-300 ease-out">
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-w-0">
          <div className="mb-5 md:mb-7">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="ln-neo-pill w-full sm:w-[min(640px,100%)] mx-auto flex items-center gap-3 px-4 py-3 transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-px active:shadow-[3px_3px_0_0_#1e2029]"
              aria-label="Open command palette"
            >
              <span className="w-10 h-10 rounded-full border-2 border-[#1e2029] bg-[#fef9c3] flex items-center justify-center text-[#1e2029] shrink-0 shadow-[2px_2px_0_0_#1e2029]">
                <Search size={18} strokeWidth={2.25} />
              </span>
              <span className="flex-1 text-left min-w-0">
                <span className="block text-sm font-bold text-[#1e2029] truncate font-['Outfit']">Search pages & actions…</span>
                <span className="block text-[11px] text-text-muted mt-0.5 truncate font-medium">Press Ctrl+K anytime</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full border-2 border-[#1e2029] bg-[#ede9fe] px-3 py-2 text-[11px] font-extrabold text-[#1e2029] shadow-[2px_2px_0_0_#1e2029]">
                Ctrl
                <span className="opacity-60">+</span>
                K
              </span>
            </button>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={pageTransition.initial}
              animate={pageTransition.animate}
              exit={pageTransition.exit}
              transition={pageTransition.transition}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} commands={commands} />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full">
          <motion.div
            initial={
              toast.type === 'error'
                ? { opacity: 0, x: 56, y: 0 }
                : { opacity: 0, y: 16, scale: 0.96 }
            }
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={
              toast.type === 'error'
                ? 'flex items-stretch overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-slate-100 shadow-2xl shadow-violet-950/40 ring-1 ring-white/10'
                : 'rounded-2xl border-2 border-[#1e2029] bg-white flex items-stretch overflow-hidden shadow-[5px_5px_0_0_#1e2029]'
            }
          >
            <div
              className="w-1.5 shrink-0"
              style={{
                backgroundColor:
                  toast.type === 'success' ? '#22c55e' : toast.type === 'error' ? '#a78bfa' : '#818cf8'
              }}
              aria-hidden
            />
            <div className="flex min-w-0 flex-1 items-start gap-4 p-4">
              <div className="mt-0.5 shrink-0">
                {toast.type === 'progress' && (
                  <Loader2 className="text-primary animate-spin" size={20} strokeWidth={2} />
                )}
                {toast.type === 'success' && (
                  <CheckCircle2 className="text-success" size={20} strokeWidth={2} />
                )}
                {toast.type === 'error' && (
                  <XCircle className="text-fuchsia-400" size={20} strokeWidth={2} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                {toast.step && (
                  <h4
                    className={`mb-1 text-sm font-bold tracking-tight ${
                      toast.type === 'error' ? 'text-violet-200' : 'text-text'
                    }`}
                  >
                    {toast.step}
                  </h4>
                )}
                <p
                  className={`text-sm leading-snug ${
                    toast.type === 'error' ? 'text-slate-300' : 'text-text-muted'
                  }`}
                >
                  {toast.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className={
                  toast.type === 'error'
                    ? 'rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white'
                    : 'rounded-lg p-1 text-text-muted transition-colors hover:bg-black/5 hover:text-text'
                }
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
      <AiTutorFab />
    </div>
  );
};

export default Layout;
