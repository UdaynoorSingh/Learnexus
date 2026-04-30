import { useState, useCallback, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ThumbsUp,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Bookmark,
  Maximize2,
  X,
  Reply,
  Trash2
} from 'lucide-react';
import {
  fetchComments,
  addComment,
  toggleUpvote,
  toggleBookmark,
  resolvePost,
  toggleCommentUpvote,
  deletePost
} from '../../services/communityService';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../services/toast';
import MarkdownBody from './MarkdownBody';
import ModalShell from '../ui/ModalShell';
import Chip from '../ui/Chip';

const spring = { type: 'spring', stiffness: 400, damping: 28 };

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

function buildCommentTree(flat) {
  if (!flat?.length) return [];
  const byId = new Map();
  flat.forEach((raw) => {
    byId.set(raw.id, {
      ...raw,
      like_count: Number(raw.like_count) || 0,
      user_has_liked: Boolean(raw.user_has_liked),
      replies: []
    });
  });
  const roots = [];
  byId.forEach((node) => {
    const pid = node.parent_comment_id;
    if (pid != null && byId.has(pid)) {
      byId.get(pid).replies.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortByTime = (a, b) => new Date(a.created_at) - new Date(b.created_at);
  const sortDeep = (arr) => {
    arr.sort(sortByTime);
    arr.forEach((n) => sortDeep(n.replies));
  };
  sortDeep(roots);
  return roots;
}

function CommentBranch({
  node,
  depth,
  post,
  currentUser,
  isOwner,
  replyingToId,
  setReplyingToId,
  replyText,
  setReplyText,
  replyAnonymous,
  setReplyAnonymous,
  submittingReply,
  replyError,
  onSubmitReply,
  likeBusyId,
  onCommentLike,
  resolveBusy,
  onResolve,
  readOnly
}) {
  const accepted = node.is_accepted_answer;
  const isTopLevel = node.parent_comment_id == null;
  const canMark =
    isOwner && !post.is_solved && currentUser && node.user_id !== currentUser.id && isTopLevel;

  return (
    <li className="list-none">
      <div
        className={`rounded-xl px-3 py-2.5 border transition-colors ${
          accepted
            ? 'bg-green-600/10 border-green-600/40 ring-1 ring-green-600/20'
            : 'bg-white/70 border-black/10'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-text">{node.author_name}</span>
              {node.is_ai_tutor && (
                <Chip variant="accent" size="xs">
                  🤖 AI Tutor
                </Chip>
              )}
              {depth > 0 && (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                  Reply
                </span>
              )}
              <span className="text-xs text-text-muted">{formatTime(node.created_at)}</span>
              {accepted && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-green-600">
                  Accepted answer
                </span>
              )}
            </div>
            <div className="mt-1.5 text-sm text-text-muted">
              <MarkdownBody>{node.content}</MarkdownBody>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <motion.button
                type="button"
                disabled={likeBusyId === node.id}
                onClick={() => onCommentLike(node.id)}
                whileHover={{ scale: 1 }}
                whileTap={{ scale: 1 }}
                transition={spring}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                  node.user_has_liked
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : ' border-black/10 text-text-muted hover:text-text hover:bg-black/5'
                }`}
              >
                <ThumbsUp
                  size={14}
                  strokeWidth={2}
                  className={node.user_has_liked ? 'fill-blue-600 text-blue-600' : ''}
                />
                {node.like_count ?? 0}
              </motion.button>
              {!readOnly && (
                <motion.button
                  type="button"
                  onClick={() =>
                    setReplyingToId((prev) => (prev === node.id ? null : node.id))
                  }
                  whileHover={{ scale: 1 }}
                  whileTap={{ scale: 1 }}
                  transition={spring}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    replyingToId === node.id
                      ? 'bg-accent/15 border-accent/35 text-accent'
                      : ' border-black/10 text-text-muted hover:text-text hover:bg-black/5'
                  }`}
                >
                  <Reply size={14} strokeWidth={2} />
                  Reply
                </motion.button>
              )}
            </div>
          </div>
          {canMark && (
            <button
              type="button"
              disabled={resolveBusy === node.id}
              onClick={() => onResolve(node.id)}
              className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600/20 text-green-600 border border-green-600/40 hover:bg-green-600/30 transition-colors disabled:opacity-50"
            >
              {resolveBusy === node.id ? '…' : 'Mark as answer'}
            </button>
          )}
        </div>
      </div>

      {!readOnly && replyingToId === node.id && (
        <form
          onSubmit={(e) => onSubmitReply(e, node.id)}
          className="mt-2 ml-1 pl-3 border-l border-blue-600/25 space-y-2"
        >
          {replyError && (
            <div className="rounded-lg bg-red-600/15 border border-red-600/30 text-red-600 text-xs px-2.5 py-1.5">
              {replyError}
            </div>
          )}
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={2}
            placeholder="Write a reply… Markdown supported."
            className="w-full border border-black/10 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none px-3 py-2 text-sm resize-y min-h-[3.5rem] bg-white/80 text-text"
            disabled={submittingReply}
          />
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-white/60 px-2.5 py-1.5 flex-1 min-w-0">
              <span className="text-[11px] font-semibold text-text">Anonymous (2 ⚡)</span>
              <button
                type="button"
                role="switch"
                aria-checked={replyAnonymous}
                onClick={() => setReplyAnonymous((v) => !v)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                  replyAnonymous ? 'bg-primary border-primary/40' : 'bg-white/80 border-black/10'
                }`}
              >
                <span
                  aria-hidden
                  className={`pointer-events-none absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-surface-light shadow transition-transform duration-200 ${
                    replyAnonymous ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setReplyingToId(null);
                  setReplyText('');
                  setReplyAnonymous(false);
                }}
                className="px-3 py-2 rounded-lg text-xs font-medium text-text-muted hover:text-text"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingReply || !replyText.trim()}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary text-white hover:opacity-90 disabled:opacity-50"
              >
                {submittingReply ? 'Posting…' : 'Post reply'}
              </button>
            </div>
          </div>
        </form>
      )}

      {node.replies?.length > 0 && (
        <ul className="mt-2 space-y-2 ml-2 sm:ml-3 pl-2 sm:pl-3 border-l border-black/10">
          {node.replies.map((child) => (
            <CommentBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              post={post}
              currentUser={currentUser}
              isOwner={isOwner}
              replyingToId={replyingToId}
              setReplyingToId={setReplyingToId}
              replyText={replyText}
              setReplyText={setReplyText}
              replyAnonymous={replyAnonymous}
              setReplyAnonymous={setReplyAnonymous}
              submittingReply={submittingReply}
              replyError={replyError}
              onSubmitReply={onSubmitReply}
              likeBusyId={likeBusyId}
              onCommentLike={onCommentLike}
              resolveBusy={resolveBusy}
              onResolve={onResolve}
              readOnly={readOnly}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

const PostCard = ({ post, onPatchPost, onRemoved, readOnly = false }) => {
  const { user: currentUser, refreshUser } = useAuth();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentAnonymously, setCommentAnonymously] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyAnonymous, setReplyAnonymous] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [likeBusyId, setLikeBusyId] = useState(null);
  const [upvoteBusy, setUpvoteBusy] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [resolveBusy, setResolveBusy] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [locallyRemoved, setLocallyRemoved] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [fullImageOpen, setFullImageOpen] = useState(false);
  const [bodyExpanded, setBodyExpanded] = useState(false);
  const [showBodyToggle, setShowBodyToggle] = useState(false);
  const bodyClampRef = useRef(null);

  useLayoutEffect(() => {
    const el = bodyClampRef.current;
    if (!el) return;
    if (bodyExpanded) {
      setShowBodyToggle(true);
      return;
    }
    const overflow = el.scrollHeight > el.clientHeight + 1;
    setShowBodyToggle(overflow);
  }, [post.content, post.id, bodyExpanded]);

  useEffect(() => {
    if (!fullImageOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setFullImageOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullImageOpen]);

  useEffect(() => {
    setReplyText('');
    setReplyAnonymous(false);
    setReplyError('');
  }, [replyingToId]);

  const openComments = useCallback(async () => {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next && !commentsLoaded) {
      setCommentsLoading(true);
      try {
        const data = await fetchComments(post.id);
        setComments(data);
        setCommentsLoaded(true);
      } catch (e) {
        console.error(e);
      } finally {
        setCommentsLoading(false);
      }
    }
  }, [commentsOpen, commentsLoaded, post.id]);

  const reloadComments = useCallback(async () => {
    try {
      const data = await fetchComments(post.id);
      setComments(data);
      setCommentsLoaded(true);
    } catch (e) {
      console.error(e);
    }
  }, [post.id]);

  const handleUpvote = async () => {
    if (upvoteBusy) return;
    setUpvoteBusy(true);
    try {
      const { upvoted, upvoteCount } = await toggleUpvote(post.id);
      onPatchPost(post.id, {
        user_has_upvoted: upvoted,
        upvote_count: upvoteCount
      });
    } catch (e) {
      console.error(e);
    } finally {
      setUpvoteBusy(false);
    }
  };

  const handleBookmark = async () => {
    if (bookmarkBusy) return;
    setBookmarkBusy(true);
    try {
      const { bookmarked, bookmarkCount } = await toggleBookmark(post.id);
      onPatchPost(post.id, {
        user_has_bookmarked: bookmarked,
        bookmark_count: bookmarkCount
      });
    } catch (e) {
      console.error(e);
    } finally {
      setBookmarkBusy(false);
    }
  };

  const handleCommentLike = async (commentId) => {
    if (likeBusyId != null) return;
    setLikeBusyId(commentId);
    try {
      const { liked, likeCount } = await toggleCommentUpvote(post.id, commentId);
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, user_has_liked: liked, like_count: likeCount } : c
        )
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLikeBusyId(null);
    }
  };

  const handleSubmitReply = async (e, parentId) => {
    e.preventDefault();
    if (!replyText.trim() || submittingReply || parentId == null) return;
    setCommentError('');
    setReplyError('');
    setSubmittingReply(true);
    try {
      const created = await addComment(post.id, replyText.trim(), {
        is_anonymous: replyAnonymous,
        parent_comment_id: parentId
      });
      setComments((prev) => [...prev, created]);
      setReplyText('');
      setReplyAnonymous(false);
      setReplyingToId(null);
      await refreshUser();
      onPatchPost(post.id, {
        comment_count: (post.comment_count || 0) + 1
      });
    } catch (err) {
      console.error(err);
      const data = err.response?.data;
      const toxic = err.response?.status === 400 && data?.toxic === true;
      if (toxic) {
        showToast(
          'error',
          'Your reply was blocked and was not posted. A 10 credit toxicity penalty was applied to your account.',
          'Content blocked'
        );
        await refreshUser();
      }
      setReplyError(data?.error || err.message || 'Could not post reply.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;
    setCommentError('');
    setSubmittingComment(true);
    try {
      const created = await addComment(post.id, newComment.trim(), {
        is_anonymous: commentAnonymously
      });
      setComments((prev) => [...prev, created]);
      setNewComment('');
      setCommentAnonymously(false);
      await refreshUser();
      onPatchPost(post.id, {
        comment_count: (post.comment_count || 0) + 1
      });
    } catch (err) {
      console.error(err);
      const data = err.response?.data;
      const toxic = err.response?.status === 400 && data?.toxic === true;
      if (toxic) {
        showToast(
          'error',
          'Your comment was blocked and was not posted. A 10 credit toxicity penalty was applied to your account.',
          'Content blocked'
        );
        await refreshUser();
      }
      setCommentError(data?.error || err.message || 'Could not post comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleResolve = async (commentId) => {
    if (resolveBusy) return;
    setResolveBusy(commentId);
    try {
      const { post: updated } = await resolvePost(post.id, commentId);
      onPatchPost(post.id, updated);
      await refreshUser();
      await reloadComments();
    } catch (e) {
      console.error(e);
    } finally {
      setResolveBusy(null);
    }
  };

  const initial = (post.author_name || '?').charAt(0).toUpperCase();
  const isOwner = currentUser && post.user_id === currentUser.id;
  const bounty = Number(post.bounty) || 0;
  const isAdmin =
    currentUser &&
    (currentUser.role === 'admin' || currentUser.role === 'superadmin');

  const handleAdminDelete = async () => {
    if (deleteBusy) return;
    if (
      !window.confirm(
        'Delete this post permanently? All comments, replies, votes, and bookmarks for this thread will be removed.'
      )
    ) {
      return;
    }
    setDeleteBusy(true);
    try {
      await deletePost(post.id);
      showToast('green-600', 'Post removed.', 'Deleted');
      if (onRemoved) onRemoved(post.id);
      else setLocallyRemoved(true);
    } catch (e) {
      console.error(e);
      showToast(
        'error',
        e.response?.data?.error || e.message || 'Could not delete post.',
        'Delete failed'
      );
    } finally {
      setDeleteBusy(false);
    }
  };

  if (locallyRemoved) return null;

  return (
    <motion.article
      layout
      whileHover={{ scale: 1, y: 0 }}
      whileTap={{ scale: 1 }}
      transition={spring}
      className="ln-card border border-black/10 rounded-2xl overflow-hidden shadow-xl hover:border-primary/25 transition-colors"
    >
      <div className="p-6 sm:p-7">
        <div className="flex gap-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-lg shadow-primary/20">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 gap-y-1 pr-1">
              <span className="font-semibold text-text truncate">{post.author_name}</span>
              <span className="text-text-muted text-sm">· {formatTime(post.created_at)}</span>
              <Chip variant="primary" size="xs">
                {post.tag}
              </Chip>
              {bounty > 0 && (
                <Chip variant="warning">
                  Bounty · {bounty} ⚡
                </Chip>
              )}
            </div>
            <h3 className="mt-2 text-lg font-bold text-text leading-snug tracking-tight pr-1">{post.title}</h3>

            {post.audio_url && (
              <div className="mt-3 mb-1 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-primary/10 via-accent/5 to-transparent border border-primary/20 px-4 py-3 shadow-sm shadow-primary/5">
                <span className="text-xs font-bold uppercase tracking-wider text-primary shrink-0">🎧 Audio</span>
                <audio
                  controls
                  src={post.audio_url}
                  className="nexus-audio-player flex-1 h-8 rounded-lg"
                  preload="none"
                />
              </div>
            )}

            <div className="mt-2 min-w-0">
              <div
                ref={bodyClampRef}
                className={`text-sm min-w-0 ${!bodyExpanded ? 'line-clamp-2 overflow-hidden' : ''}`}
              >
                <MarkdownBody>{post.content}</MarkdownBody>
              </div>
              {showBodyToggle && (
                <button
                  type="button"
                  onClick={() => setBodyExpanded((v) => !v)}
                  className="mt-1.5 text-sm font-semibold text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/40 rounded"
                >
                  {bodyExpanded ? 'Read less' : 'Read more'}
                </button>
              )}
            </div>

            {post.image_url && !imgError && (
              <div className="mt-4 rounded-xl overflow-hidden border border-black/10 bg-white/60 ring-1 ring-black/5 shadow-lg relative">
                <button
                  type="button"
                  onClick={() => setFullImageOpen(true)}
                  className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-none"
                  aria-label="View full image"
                >
                  <img
                    src={post.image_url}
                    alt=""
                    className="w-full max-h-80 object-cover sm:object-contain cursor-zoom-in"
                    onError={() => setImgError(true)}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setFullImageOpen(true)}
                  className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-text border border-black/10 bg-white/90 hover:bg-white transition-colors shadow-lg"
                >
                  <Maximize2 size={14} strokeWidth={2} aria-hidden />
                  Full image
                </button>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <motion.button
                type="button"
                onClick={handleUpvote}
                disabled={upvoteBusy}
                whileHover={{ scale: 1 }}
                whileTap={{ scale: 1 }}
                transition={spring}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                  post.user_has_upvoted
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : ' border-black/10 text-text-muted hover:text-text hover:bg-black/5 hover:border-black/20'
                } disabled:opacity-50`}
              >
                <ThumbsUp
                  size={16}
                  strokeWidth={2}
                  className={post.user_has_upvoted ? 'fill-blue-600 text-blue-600' : ''}
                />
                {post.upvote_count ?? 0}
              </motion.button>

              <motion.button
                type="button"
                onClick={openComments}
                whileHover={{ scale: 1 }}
                whileTap={{ scale: 1 }}
                transition={spring}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-black/10 text-text-muted hover:text-text hover:bg-black/5 hover:border-black/20 transition-colors"
              >
                <MessageCircle size={16} strokeWidth={2} />
                {post.comment_count ?? 0}
                {commentsOpen ? <ChevronUp size={14} strokeWidth={2} /> : <ChevronDown size={14} strokeWidth={2} />}
              </motion.button>

              <motion.button
                type="button"
                onClick={handleBookmark}
                disabled={bookmarkBusy}
                whileHover={{ scale: 1 }}
                whileTap={{ scale: 1 }}
                transition={spring}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border disabled:opacity-50 ${
                  post.user_has_bookmarked
                    ? 'bg-accent/20 border-accent/40 text-accent'
                    : ' border-black/10 text-text-muted hover:text-text hover:bg-black/5 hover:border-black/20'
                }`}
                title="Save for later"
              >
                <Bookmark
                  size={16}
                  strokeWidth={2}
                  className={post.user_has_bookmarked ? 'fill-indigo-600 text-indigo-600' : ''}
                />
                {post.bookmark_count ?? 0}
              </motion.button>

              {post.is_solved && (
                <Chip variant="success">
                  <CircleCheck size={14} strokeWidth={2} />
                  Solved
                </Chip>
              )}
            </div>
          </div>
          {isAdmin && (
            <div className="shrink-0 flex flex-col items-end gap-1 pt-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-red-600/80">Admin</span>
              <motion.button
                type="button"
                onClick={handleAdminDelete}
                disabled={deleteBusy}
                whileHover={{ scale: 1 }}
                whileTap={{ scale: 1 }}
                transition={spring}
                className="inline-flex items-center justify-center rounded-xl p-2.5 border border-red-600/40 bg-red-600/10 text-red-600 hover:bg-red-600/18 disabled:opacity-50"
                title="Delete this post (admin only)"
                aria-label="Delete post as admin"
              >
                <Trash2 size={18} strokeWidth={2} />
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {commentsOpen && (
        <div className="border-t border-black/10 bg-white/40 px-5 sm:px-6 py-4">
          {commentsLoading ? (
            <p className="text-sm text-text-muted">Loading comments…</p>
          ) : (
            <ul className="space-y-3">
              {buildCommentTree(comments).map((node) => (
                <CommentBranch
                  key={node.id}
                  node={node}
                  depth={0}
                  post={post}
                  currentUser={currentUser}
                  isOwner={isOwner}
                  replyingToId={replyingToId}
                  setReplyingToId={setReplyingToId}
                  replyText={replyText}
                  setReplyText={setReplyText}
                  replyAnonymous={replyAnonymous}
                  setReplyAnonymous={setReplyAnonymous}
                  submittingReply={submittingReply}
                  replyError={replyError}
                  onSubmitReply={handleSubmitReply}
                  likeBusyId={likeBusyId}
                  onCommentLike={handleCommentLike}
                  resolveBusy={resolveBusy}
                  onResolve={handleResolve}
                  readOnly={readOnly}
                />
              ))}
            </ul>
          )}

          {!readOnly && (
          <form onSubmit={handleAddComment} className="mt-4 flex flex-col gap-2">
            {commentError && (
              <div className="rounded-none bg-red-600/15 border border-red-600/30 text-red-600 text-sm px-3 py-2">
                {commentError}
              </div>
            )}
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              placeholder="Answer or ask a follow-up — Markdown and ```code``` blocks work."
              className="w-full border border-black/10 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none px-4 py-2.5 text-sm resize-y min-h-[4.5rem] bg-white/80 text-text"
            />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-black/10 bg-white/60 px-3 py-2 flex-1 min-w-0">
                <span className="text-xs font-semibold text-text">
                  Comment Anonymously (Costs 2 ⚡)
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={commentAnonymously}
                  onClick={() => setCommentAnonymously((v) => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                    commentAnonymously
                      ? 'bg-primary border-primary/40'
                      : 'bg-white/80 border-black/10'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute top-1 left-1 h-4 w-4 rounded-full bg-surface-light shadow transition-transform duration-200 ease-out ${
                      commentAnonymously ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <button
                type="submit"
                disabled={submittingComment || !newComment.trim()}
                className="self-end sm:self-center px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:opacity-90 disabled:opacity-50 shrink-0"
              >
                Comment
              </button>
            </div>
          </form>
          )}
        </div>
      )}

      {typeof document !== 'undefined' &&
        createPortal(
          <ModalShell
            open={fullImageOpen && Boolean(post.image_url) && !imgError}
            onClose={() => setFullImageOpen(false)}
            title="Full image"
            maxWidth="max-w-[min(100vw-1.5rem,1200px)]"
            contentClassName="p-2 sm:p-4 flex items-center justify-center"
          >
            <img
              src={post.image_url}
              alt=""
              className="max-w-full max-h-[min(85vh,880px)] w-auto h-auto object-contain rounded-xl"
            />
          </ModalShell>,
          document.body
        )}
    </motion.article>
  );
};

export default PostCard;
