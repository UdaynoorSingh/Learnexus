import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { createLibraryPost } from '../../services/libraryService';
import { showToast } from '../../services/toast';

const spring = { type: 'spring', stiffness: 400, damping: 32 };

const CreateLibraryModal = ({ open, onClose, onCreated, scope = 'college' }) => {
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setTopic('');
      setDescription('');
      setContent('');
      setDifficulty('intermediate');
      setError('');
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await createLibraryPost({
        topic: topic.trim(),
        description: description.trim(),
        content: content.trim(),
        difficulty,
        scope
      });
      showToast('success', 'Your post is live! Audio summary is being generated…', 'Published');
      onCreated?.();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to create post.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const difficulties = [
    { value: 'beginner', label: '🟢 Beginner', desc: 'No prerequisites needed' },
    { value: 'intermediate', label: '🟡 Intermediate', desc: 'Some background helpful' },
    { value: 'advanced', label: '🔴 Advanced', desc: 'Requires strong foundations' }
  ];

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
            aria-label="Close modal"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={spring}
            className="relative w-full max-w-lg glass-float border border-black/10 shadow-xl shadow-black/10 rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 bg-white/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md shadow-primary/20">
                  <Sparkles size={16} strokeWidth={2} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text tracking-tight">New Library Post</h2>
                  <p className="text-[10px] text-text-muted font-medium">AI audio summary auto-generated</p>
                </div>
              </div>
              <motion.button
                type="button"
                onClick={onClose}
                whileHover={{ scale: 1 }}
                whileTap={{ scale: 1 }}
                transition={spring}
                className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-black/5 transition-colors"
              >
                <X size={20} strokeWidth={2} />
              </motion.button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
                {error && (
                  <div className="rounded-xl bg-danger/15 border border-danger/30 text-danger text-sm px-4 py-2">
                    {error}
                  </div>
                )}

                <p className="text-[11px] text-text-muted rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
                  🎤 Your <strong>description</strong> will be converted into a 1-minute audio summary using AI text-to-speech. Write it as you'd say it!
                </p>

                {/* Topic */}
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                    Topic *
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full rounded-xl input-premium px-4 py-2.5 text-text placeholder:text-text-muted/50"
                    placeholder="e.g. Binary Search Trees, React Hooks, Machine Learning Basics"
                    maxLength={255}
                    required
                  />
                </div>

                {/* Description (= Audio Script) */}
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                    Description / Audio Script *
                  </label>
                  <p className="text-[10px] text-text-muted mb-1.5">
                    This text will be spoken as your 1-min audio. Aim for ~100-120 words.
                  </p>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    maxLength={500}
                    className="w-full rounded-xl input-premium px-4 py-2.5 text-text placeholder:text-text-muted/50 resize-y min-h-[5rem]"
                    placeholder="Hey everyone! In this post I break down the key concepts of Binary Search Trees. You'll learn how insertion, deletion, and search operations work under the hood, and why BSTs are so fundamental to computer science. Let's dive in!"
                    required
                  />
                  <p className="text-[10px] text-text-muted text-right mt-1 tabular-nums">
                    {description.trim().split(/\s+/).filter(Boolean).length} words · {description.length}/500 chars
                  </p>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                    Difficulty Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {difficulties.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setDifficulty(d.value)}
                        className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                          difficulty === d.value
                            ? 'bg-primary/15 border-primary/40 text-primary shadow-sm shadow-primary/10'
                            : 'bg-white/70 border-black/10 text-text-muted hover:border-black/20 hover:text-text hover:bg-white/90'
                        }`}
                      >
                        <span className="text-sm">{d.label.split(' ')[0]}</span>
                        <span className="font-semibold">{d.label.split(' ')[1]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div>
                  <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                    Content *
                  </label>
                  <p className="text-[11px] text-text-muted mb-2">
                    Write your blog/notes content. Markdown supported: **bold**, lists, code blocks, etc.
                  </p>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={8}
                    className="w-full rounded-xl input-premium px-4 py-2.5 text-text placeholder:text-text-muted/50 resize-y min-h-[160px] font-mono text-sm"
                    placeholder={'# Getting Started\n\nWrite your notes or blog content here…\n\n## Key Concepts\n\n- Point 1\n- Point 2\n\n```python\ndef example():\n    return "hello"\n```'}
                    required
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-black/10 bg-white/70 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:text-text hover:bg-black/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-gradient px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Publishing…' : '✨ Publish'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateLibraryModal;
