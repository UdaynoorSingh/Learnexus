import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '../../utils/cn';

const spring = { type: 'spring', stiffness: 420, damping: 32 };

function useLockBodyScroll(active) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}


export default function ModalShell({
  open,
  onClose,
  title,
  subtitle = null,
  icon = null,
  children,
  footer = null,
  className,
  contentClassName,
  maxWidth = 'max-w-lg',
  closeLabel = 'Close',
  dismissible = true,
}) {
  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && dismissible) onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, dismissible, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 modal-backdrop"
            aria-label={closeLabel}
            onClick={() => (dismissible ? onClose?.() : null)}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : 'Dialog'}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={spring}
            className={cn(
              'relative w-full glass-float ln-modal overflow-hidden max-h-[90vh] flex flex-col',
              maxWidth,
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {(title || dismissible) && (
              <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-black/10 bg-white/70 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  {icon ? (
                    <div className="w-9 h-9 rounded-xl bg-white/80 border border-black/10 flex items-center justify-center shrink-0">
                      {icon}
                    </div>
                  ) : null}
                  <div className="min-w-0">
                    {title ? (
                      <h2 className="text-lg font-bold text-text tracking-tight truncate">{title}</h2>
                    ) : null}
                    {subtitle ? (
                      <p className="text-[10px] text-text-muted font-medium truncate">{subtitle}</p>
                    ) : null}
                  </div>
                </div>

                {dismissible && (
                  <motion.button
                    type="button"
                    onClick={onClose}
                    whileHover={{ scale: 1 }}
                    whileTap={{ scale: 1 }}
                    transition={spring}
                    className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-black/5 transition-colors shrink-0"
                    aria-label={closeLabel}
                  >
                    <X size={20} strokeWidth={2} />
                  </motion.button>
                )}
              </div>
            )}

            <div className={cn('overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar', contentClassName)}>
              {children}
            </div>

            {footer ? (
              <div className="px-6 py-4 border-t border-black/10 bg-white/70 flex justify-end gap-3 shrink-0">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

