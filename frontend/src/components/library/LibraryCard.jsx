import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Clock,
  User,
  ChevronRight,
  Headphones,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Trash2
} from 'lucide-react';
import { voteLibraryPost, deleteLibraryPost } from '../../services/libraryService';
import { showToast } from '../../services/toast';
import MarkdownBody from '../community/MarkdownBody';
import ModalShell from '../ui/ModalShell';
import Chip from '../ui/Chip';

const spring = { type: 'spring', stiffness: 400, damping: 28 };

const difficultyConfig = {
  beginner: {
    label: 'Beginner',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-400'
  },
  intermediate: {
    label: 'Intermediate',
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400'
  },
  advanced: {
    label: 'Advanced',
    color: 'text-rose-400',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/30',
    dot: 'bg-rose-400'
  }
};

const formatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const LibraryCard = ({ post, currentUserId, onPatch, onRemoved }) => {
  const [contentOpen, setContentOpen] = useState(false);
  const [voteBusy, setVoteBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const diff = difficultyConfig[post.difficulty] || difficultyConfig.intermediate;
  const initial = (post.author_name || '?').charAt(0).toUpperCase();
  const isOwner = currentUserId && post.user_id === currentUserId;

  const handleVote = async (type) => {
    if (voteBusy) return;
    setVoteBusy(true);
    try {
      const data = await voteLibraryPost(post.id, type);
      onPatch?.(post.id, {
        like_count: data.like_count,
        dislike_count: data.dislike_count,
        user_vote: data.user_vote
      });
    } catch (e) {
      console.error(e);
    } finally {
      setVoteBusy(false);
    }
  };

  const handleDelete = async () => {
    if (deleteBusy) return;
    if (!window.confirm('Delete this post permanently?')) return;
    setDeleteBusy(true);
    try {
      await deleteLibraryPost(post.id);
      showToast('success', 'Post deleted.', 'Deleted');
      onRemoved?.(post.id);
    } catch (e) {
      console.error(e);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <>
      <motion.div
        layout
        whileHover={{ scale: 1, y: 0 }}
        whileTap={{ scale: 1 }}
        transition={spring}
        className="ln-card border border-black/10 rounded-2xl overflow-hidden shadow-lg shadow-black/10 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 flex flex-col"
      >
        <div className="h-1 bg-gradient-to-r from-primary via-accent to-secondary" />

        <div className="p-5 sm:p-6 flex flex-col flex-1">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md shadow-primary/20">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text truncate">{post.author_name}</p>
                <p className="text-[10px] text-text-muted">{formatTime(post.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Chip variant="neutral" size="xs" className={`${diff.bg} ${diff.border} ${diff.color} border`}>
                <span className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
                {diff.label}
              </Chip>
              {isOwner && (
                <motion.button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteBusy}
                  whileHover={{ scale: 1 }}
                  whileTap={{ scale: 1 }}
                  transition={spring}
                  className="p-1.5 rounded-lg border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20 disabled:opacity-50 transition-colors"
                  title="Delete post"
                  aria-label="Delete post"
                >
                  <Trash2 size={14} strokeWidth={2} />
                </motion.button>
              )}
            </div>
          </div>

          <h3 className="text-lg font-bold text-text leading-snug tracking-tight mb-2">
            {post.topic}
          </h3>

          <p className="text-sm text-text-muted leading-relaxed line-clamp-3 mb-4">
            {post.description}
          </p>

          {post.audio_url ? (
            <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-primary/10 via-accent/5 to-transparent border border-primary/20 px-4 py-3 mb-4 shadow-sm shadow-primary/5">
              <div className="flex items-center gap-1.5 shrink-0">
                <Headphones size={14} strokeWidth={2} className="text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary/80">Audio</span>
              </div>
              <audio
                controls
                src={post.audio_url}
                className="nexus-audio-player flex-1 h-8 rounded-lg"
                preload="none"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-white/70 border border-black/10 px-4 py-3 mb-4">
              <Loader2 size={14} strokeWidth={2} className="text-text-muted animate-spin" />
              <span className="text-[11px] text-text-muted font-medium">Generating audio summary…</span>
            </div>
          )}

          <div className="mt-auto pt-1 flex items-center gap-2">
            <motion.button
              type="button"
              onClick={() => handleVote('like')}
              disabled={voteBusy}
              whileHover={{ scale: 1 }}
              whileTap={{ scale: 1 }}
              transition={spring}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors disabled:opacity-50 ${
                post.user_vote === 'like'
                  ? 'bg-primary/20 border-primary/40 text-primary'
                  : 'bg-white/70 border-black/10 text-text-muted hover:text-text hover:bg-white/90 hover:border-black/20'
              }`}
            >
              <ThumbsUp
                size={15}
                strokeWidth={2}
                className={post.user_vote === 'like' ? 'fill-primary text-primary' : ''}
              />
              <span className="tabular-nums">{post.like_count ?? 0}</span>
            </motion.button>

            <motion.button
              type="button"
              onClick={() => handleVote('dislike')}
              disabled={voteBusy}
              whileHover={{ scale: 1 }}
              whileTap={{ scale: 1 }}
              transition={spring}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors disabled:opacity-50 ${
                post.user_vote === 'dislike'
                  ? 'bg-danger/20 border-danger/40 text-danger'
                  : 'bg-white/70 border-black/10 text-text-muted hover:text-text hover:bg-white/90 hover:border-black/20'
              }`}
            >
              <ThumbsDown
                size={15}
                strokeWidth={2}
                className={post.user_vote === 'dislike' ? 'fill-danger text-danger' : ''}
              />
              <span className="tabular-nums">{post.dislike_count ?? 0}</span>
            </motion.button>

            <motion.button
              type="button"
              onClick={() => setContentOpen(true)}
              whileHover={{ scale: 1 }}
              whileTap={{ scale: 1 }}
              transition={spring}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary/15 text-primary border border-primary/25 hover:bg-primary/25 hover:border-primary/40 transition-colors"
            >
              <BookOpen size={15} strokeWidth={2} />
              Read
              <ChevronRight size={14} strokeWidth={2} />
            </motion.button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {contentOpen && (
          <ModalShell
            open={contentOpen}
            onClose={() => setContentOpen(false)}
            title={post.topic}
            subtitle={`${post.author_name} · ${formatTime(post.created_at)}`}
            maxWidth="max-w-2xl"
          >
            {post.audio_url ? (
              <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-primary/10 via-accent/5 to-transparent border border-primary/20 px-4 py-3">
                <div className="flex items-center gap-1.5 shrink-0">
                  <Headphones size={14} strokeWidth={2} className="text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary/80">Listen</span>
                </div>
                <audio
                  controls
                  src={post.audio_url}
                  className="nexus-audio-player flex-1 h-8 rounded-lg"
                  preload="metadata"
                />
              </div>
            ) : null}

            <div className="text-sm leading-relaxed">
              <MarkdownBody>{post.content}</MarkdownBody>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>
    </>
  );
};

export default LibraryCard;
