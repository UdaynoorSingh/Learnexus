import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { FiLoader, FiCheckCircle, FiXCircle, FiX } from 'react-icons/fi';

const socket = io('http://localhost:5000', { autoConnect: false });

const Layout = () => {
  const { user } = useAuth();
  const [toast, setToast] = useState(null); // { type: 'progress' | 'success' | 'error', step?: string, message: string }

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

  return (
    <div className="flex min-h-screen bg-background relative overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 md:ml-72 min-h-screen">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Global Toast Notification for WebSockets */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fadeInUp max-w-sm w-full">
          <div className="glass-card p-4 flex items-start gap-4 shadow-xl border-l-4" 
               style={{ borderLeftColor: toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#8b5cf6' }}>
            <div className="mt-1">
              {toast.type === 'progress' && <FiLoader className="text-primary animate-spin" size={20} />}
              {toast.type === 'success' && <FiCheckCircle className="text-success" size={20} />}
              {toast.type === 'error' && <FiXCircle className="text-danger" size={20} />}
            </div>
            <div className="flex-1">
              {toast.step && <h4 className="text-sm font-bold text-text mb-1">{toast.step}</h4>}
              <p className="text-sm text-text-muted">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="text-text-muted hover:text-text transition-colors">
              <FiX size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
