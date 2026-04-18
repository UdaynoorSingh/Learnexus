import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Clock,
  User,
  X,
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
        className="glass-card border border-black/10 rounded-2xl overflow-hidden shadow-lg shadow-black/10 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 flex flex-col"
      >
        {/* Top gradient accent */}
        <div className="h-1 bg-gradient-to-r from-primary via-accent to-secondary" />

        <div className="p-5 sm:p-6 flex flex-col flex-1">
          {/* Header: author + time + difficulty */}
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
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg ${diff.bg} ${diff.border} ${diff.color} border`}>
                <span className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
                {diff.label}
              </span>
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

          {/* Topic / Title */}
          <h3 className="text-lg font-bold text-text leading-snug tracking-tight mb-2">
            {post.topic}
          </h3>

          {/* Description */}
          <p className="text-sm text-text-muted leading-relaxed line-clamp-3 mb-4">
            {post.description}
          </p>

          {/* Audio Player */}
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

          {/* Like / Dislike + Read button */}
          <div className="mt-auto pt-1 flex items-center gap-2">
            {/* Like */}
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

            {/* Dislike */}
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

            {/* Read Full Content */}
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

      {/* Full Content Modal */}
      <AnimatePresence>
        {contentOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
            <motion.button
              type="button"
              aria-label="Close"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 modal-backdrop"
              onClick={() => setContentOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={spring}
              className="relative z-[101] w-full max-w-2xl max-h-[90vh] glass-float border border-black/10 rounded-2xl shadow-xl shadow-black/10 overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-black/10 bg-white/70 shrink-0">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-text tracking-tight truncate">{post.topic}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-text-muted flex items-center gap-1.5">
                      <User size={12} strokeWidth={2} />
                      {post.author_name}
                    </span>
                    <span className="text-xs text-text-muted flex items-center gap-1.5">
                      <Clock size={12} strokeWidth={2} />
                      {formatTime(post.created_at)}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${diff.bg} ${diff.border} ${diff.color} border`}>
                      {diff.label}
                    </span>
                  </div>
                </div>
                <motion.button
                  type="button"
                  onClick={() => setContentOpen(false)}
                  whileHover={{ scale: 1 }}
                  whileTap={{ scale: 1 }}
                  className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-black/5 shrink-0"
                  aria-label="Close"
                >
                  <X size={20} strokeWidth={2} />
                </motion.button>
              </div>

              {/* Audio player in modal */}
              {post.audio_url && (
                <div className="flex items-center gap-3 mx-6 mt-4 rounded-xl bg-gradient-to-r from-primary/10 via-accent/5 to-transparent border border-primary/20 px-4 py-3">
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
              )}

              {/* Content body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5">
                <div className="text-sm leading-relaxed">
                  <MarkdownBody>{post.content}</MarkdownBody>
                </div>
              </div>

              <div className="text-[10px] text-text-muted text-center px-4 py-2 border-t border-black/10 bg-white/70 shrink-0">
                Press Esc or click outside to close
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LibraryCard;
