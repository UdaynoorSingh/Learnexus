import { FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const NoteViewerModal = ({ url, onClose }) => {
  if (!url) return null;

  const fullUrl = url.startsWith('http') ? url : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${url}`;
  const isPdf = fullUrl.toLowerCase().split('?')[0].endsWith('.pdf');

  return (
    <AnimatePresence>
      {url && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center modal-backdrop p-4 sm:p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-5xl h-full flex flex-col bg-white/90 border border-black/10 rounded-2xl overflow-hidden shadow-xl shadow-black/10 relative"
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="px-4 py-3 border-b border-black/10 flex justify-between items-center bg-white/70 shrink-0">
              <h3 className="text-sm font-semibold text-text">Note Viewer</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-black/5 transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="flex-1 bg-white/40 overflow-hidden relative select-none w-full h-full flex items-center justify-center">
              <div
                className="absolute inset-0 z-20 pointer-events-none"
              />
              {isPdf ? (
                <iframe
                  src={`${fullUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                  className="w-full h-full border-0 select-none"
                  style={{ pointerEvents: 'auto' }}
                  title="PDF Viewer"
                />
              ) : (
                <img
                  src={fullUrl}
                  alt="Note view"
                  className="max-w-full max-h-full object-contain pointer-events-none select-none"
                  draggable={false}
                />
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NoteViewerModal;
