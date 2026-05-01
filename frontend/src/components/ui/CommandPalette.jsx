import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CornerDownLeft, ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';

const spring = { type: 'spring', stiffness: 420, damping: 32 };

export default function CommandPalette({ open, onOpenChange, commands = [] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);

  const normalized = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = Array.isArray(commands) ? commands : [];
    if (!q) return list;
    return list.filter((c) => {
      const hay = `${c.label || ''} ${c.keywords || ''} ${c.path || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [commands, query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIdx(0);
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onOpenChange(false);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, Math.max(0, normalized.length - 1)));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter') {
        const cmd = normalized[activeIdx];
        if (!cmd) return;
        if (typeof cmd.action === 'function') cmd.action();
        if (cmd.path) navigate(cmd.path);
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, normalized, activeIdx, navigate, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    onOpenChange(false);
  }, [location.pathname]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center p-4 sm:p-6">
          <motion.button
            type="button"
            aria-label="Close command palette"
            className="absolute inset-0 modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={spring}
            className="relative w-full max-w-2xl rounded-3xl border-[3px] border-[#1e2029] bg-white shadow-[8px_8px_0_0_#1e2029] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 sm:px-6 py-4 border-b-2 border-[#1e2029]/12 bg-[#fafafa] flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#fef9c3] border-2 border-[#1e2029] text-[#1e2029] flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_#1e2029]">
                <Search size={18} strokeWidth={2.25} />
              </div>
              <div className="flex-1 min-w-0">
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search pages and actions…"
                  className="w-full bg-transparent outline-none text-text placeholder:text-text-muted/70 font-semibold tracking-tight"
                />
                <div className="mt-1 text-[11px] text-text-muted flex items-center gap-2">
                  <span className="inline-flex items-center gap-1">
                    <CornerDownLeft size={12} /> Enter
                  </span>
                  <span className="opacity-60">·</span>
                  <span>Esc to close</span>
                </div>
              </div>
            </div>

            <div className="max-h-[62vh] overflow-y-auto custom-scrollbar bg-white">
              {normalized.length === 0 ? (
                <div className="p-10 text-center text-text-muted">
                  No matches.
                </div>
              ) : (
                <div className="p-2">
                  {normalized.map((cmd, idx) => {
                    const active = idx === activeIdx;
                    return (
                      <button
                        key={`${cmd.label}-${cmd.path || idx}`}
                        type="button"
                        onMouseEnter={() => setActiveIdx(idx)}
                        onClick={() => {
                          if (typeof cmd.action === 'function') cmd.action();
                          if (cmd.path) navigate(cmd.path);
                          onOpenChange(false);
                        }}
                        className={cn(
                          'w-full text-left px-4 py-3 rounded-2xl border-2 transition-all flex items-center justify-between gap-4 font-["Outfit"]',
                          active
                            ? 'bg-[#ede9fe] border-[#1e2029] text-[#5b21b6] shadow-[3px_3px_0_0_#1e2029]'
                            : 'bg-white border-[#1e2029]/15 text-text hover:border-[#1e2029]/35 hover:bg-[#fafafa]'
                        )}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">{cmd.label}</p>
                          {cmd.hint && <p className="text-[11px] text-text-muted mt-0.5 truncate">{cmd.hint}</p>}
                        </div>
                        <ArrowRight size={16} className={active ? 'text-primary' : 'text-text-muted'} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

