import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchBookmarkedPosts } from '../services/communityService';
import PostCard from '../components/community/PostCard';
import { FiBookmark, FiArrowLeft } from 'react-icons/fi';

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
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
      </div>

      {error && (
        <div className="rounded-xl bg-danger/15 border border-danger/30 text-danger text-sm px-4 py-3">{error}</div>
      )}

      {loading ? (
        <div className="glass-card border border-white/10 rounded-2xl p-12 text-center text-text-muted">
          Loading bookmarks…
        </div>
      ) : posts.length === 0 ? (
        <div className="glass-card border border-white/10 rounded-2xl p-12 text-center">
          <FiBookmark size={40} className="mx-auto mb-3 text-text-muted opacity-40" />
          <p className="text-text-muted">No bookmarked posts yet.</p>
          <Link
            to="/nexus-board"
            className="inline-block mt-4 text-sm font-semibold text-primary hover:underline"
          >
            Go to Nexus Board
          </Link>
        </div>
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
