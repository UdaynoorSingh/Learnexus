import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { io } from 'socket.io-client';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { Loader2, CheckCircle2, XCircle, X } from 'lucide-react';

const socket = io('http://localhost:5000', { autoConnect: false });

const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] }
};

const Layout = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [toast, setToast] = useState(null);

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

  return (
    <div className="flex min-h-screen bg-background relative overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 min-h-screen min-w-0 w-0 md:pl-[var(--sidebar-offset,21rem)] transition-[padding] duration-300 ease-out">
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-w-0">
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

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fadeInUp max-w-sm w-full">
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="glass-float rounded-2xl p-4 flex items-start gap-4 shadow-2xl border-l-4"
            style={{
              borderLeftColor:
                toast.type === 'success' ? '#22c55e' : toast.type === 'error' ? '#f87171' : '#818cf8'
            }}
          >
            <div className="mt-0.5 shrink-0">
              {toast.type === 'progress' && (
                <Loader2 className="text-primary animate-spin" size={20} strokeWidth={2} />
              )}
              {toast.type === 'success' && (
                <CheckCircle2 className="text-success" size={20} strokeWidth={2} />
              )}
              {toast.type === 'error' && <XCircle className="text-danger" size={20} strokeWidth={2} />}
            </div>
            <div className="flex-1 min-w-0">
              {toast.step && <h4 className="text-sm font-bold text-text mb-1 tracking-tight">{toast.step}</h4>}
              <p className="text-sm text-text-muted leading-snug">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-text-muted hover:text-text transition-colors p-1 rounded-lg hover:bg-white/5"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Layout;
