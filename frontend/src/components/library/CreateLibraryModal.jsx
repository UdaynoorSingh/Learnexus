import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { createLibraryPost } from '../../services/libraryService';
import { showToast } from '../../services/toast';
import ModalShell from '../ui/ModalShell';
import Button from '../ui/Button';

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
    <ModalShell
      open={open}
      onClose={onClose}
      title="New Library Post"
      subtitle="AI audio summary auto-generated"
      icon={<Sparkles size={18} strokeWidth={2} className="text-primary" />}
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="soft" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-library-form" disabled={submitting}>
            {submitting ? 'Publishing…' : '✨ Publish'}
          </Button>
        </>
      }
    >
      <form id="create-library-form" onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-xl bg-danger/15 border border-danger/30 text-danger text-sm px-4 py-2">
                    {error}
                  </div>
                )}

                <p className="text-[11px] text-text-muted rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
                  🎤 Your <strong>description</strong> will be converted into a 1-minute audio summary using AI text-to-speech. Write it as you'd say it!
                </p>

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
      </form>
    </ModalShell>
  );
};

export default CreateLibraryModal;
