import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchBookmarkedPosts } from '../services/communityService';
import PostCard from '../components/community/PostCard';
import { FiBookmark, FiArrowLeft } from 'react-icons/fi';
import PageMascot from '../components/ui/PageMascot';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';

const BookmarkedPostsPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchBookmarkedPosts();
      setPosts(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not load bookmarked posts.');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patchPost = useCallback((id, partial) => {
    setPosts((prev) => {
      if (partial.user_has_bookmarked === false) {
        return prev.filter((p) => p.id !== id);
      }
      return prev.map((p) => (p.id === id ? { ...p, ...partial } : p));
    });
  }, []);

  const removePost = useCallback((id) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeInUp">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="min-w-0 flex-1">
          <Link
            to="/profile"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-primary transition-colors mb-2"
          >
            <FiArrowLeft size={16} />
            Back to profile
          </Link>
          <h1 className="text-2xl font-bold text-text tracking-tight flex items-center gap-2">
            <FiBookmark className="text-accent shrink-0" size={28} />
            Bookmarked posts
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Threads you saved from the{' '}
            <Link to="/nexus-board" className="text-primary font-medium hover:underline">
              Nexus Board
            </Link>
            .
          </p>
        </div>
        <PageMascot role="bookmarks" size="md" className="shrink-0 self-center lg:self-start" hideOnMobile />
      </div>

      {error && (
        <div className="rounded-xl bg-danger/15 border border-danger/30 text-danger text-sm px-4 py-3" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white/70 shadow-sm">
          <LoadingSpinner size="lg" text="Loading your bookmarks…" />
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          illustration="feed"
          title="No bookmarked posts yet"
          description="When you save a thread on Nexus Board, it shows up here for quick reading later."
          ctaLabel="Browse Nexus Board"
          to="/nexus-board"
        />
      ) : (
        <div className="space-y-5">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onPatchPost={patchPost} onRemoved={removePost} />
          ))}
        </div>
      )}
    </div>
  );
};

export default BookmarkedPostsPage;
