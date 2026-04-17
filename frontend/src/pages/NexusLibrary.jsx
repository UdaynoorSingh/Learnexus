import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Library, Plus, Headphones, Sparkles, RefreshCw } from 'lucide-react';
import { fetchLibraryPosts } from '../services/libraryService';
import LibraryCard from '../components/library/LibraryCard';
import CreateLibraryModal from '../components/library/CreateLibraryModal';
import EmptyState from '../components/ui/EmptyState';
import { useAuth } from '../context/AuthContext';

const spring = { type: 'spring', stiffness: 380, damping: 30 };

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 360, damping: 26 }
  }
};

const NexusLibrary = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scope, setScope] = useState('college');
  const [modalOpen, setModalOpen] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchLibraryPosts({ scope });
      setPosts(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not load the library.');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const collegeLabel =
    user?.college_name || (user?.college_id != null ? `College #${user.college_id}` : 'My college');

  const patchPost = useCallback((id, partial) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...partial } : p)));
  }, []);

  const removePost = useCallback((id) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="mb-8"
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
              <Library size={28} strokeWidth={1.8} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-text tracking-tight">
                Nexus Library
              </h1>
              <p className="text-text-muted text-sm mt-1 max-w-xl leading-relaxed">
                Community-curated blogs & notes with AI-generated audio summaries. Learn on the go.
              </p>
            </div>
          </div>

          <motion.button
            type="button"
            onClick={() => setModalOpen(true)}
            whileHover={{ scale: 1 }}
            whileTap={{ scale: 1 }}
            transition={spring}
            className="hidden sm:inline-flex items-center gap-2 btn-gradient rounded-xl px-6 py-3.5 text-sm font-semibold shadow-lg shadow-primary/25 shrink-0"
          >
            <Plus size={18} strokeWidth={2.5} />
            New Post
          </motion.button>
        </div>

        {/* Stats + controls */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
            <Headphones size={15} strokeWidth={2} />
            <span className="tabular-nums">{posts.length}</span> posts
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-accent/10 border border-accent/20 text-sm font-medium text-accent">
            <Sparkles size={15} strokeWidth={2} />
            AI Audio
          </div>
          <motion.button
            type="button"
            onClick={loadPosts}
            disabled={loading}
            whileHover={{ scale: 1 }}
            whileTap={{ scale: 1 }}
            transition={spring}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/70 border border-black/10 text-sm font-medium text-text-muted hover:text-text hover:bg-white/90 disabled:opacity-50"
            title="Refresh library"
          >
            <RefreshCw size={14} strokeWidth={2} className={loading ? 'animate-spin' : ''} />
          </motion.button>

          {/* Mobile create button */}
          <motion.button
            type="button"
            onClick={() => setModalOpen(true)}
            whileHover={{ scale: 1 }}
            whileTap={{ scale: 1 }}
            transition={spring}
            className="sm:hidden inline-flex items-center gap-2 btn-gradient rounded-xl px-4 py-2 text-sm font-semibold shadow-lg shadow-primary/25 ml-auto"
          >
            <Plus size={16} strokeWidth={2.5} />
            New
          </motion.button>
        </div>

        {/* Scope tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setScope('college')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors max-w-[14rem] truncate ${scope === 'college'
              ? 'bg-primary/20 border-primary/45 text-primary'
              : 'bg-white/70 border-black/10 text-text-muted hover:text-text hover:bg-white/90'
              }`}
            title={collegeLabel}
          >
            {collegeLabel}
          </button>
          <button
            type="button"
            onClick={() => setScope('global')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${scope === 'global'
              ? 'bg-primary/20 border-primary/45 text-primary'
              : 'bg-white/70 border-black/10 text-text-muted hover:text-text hover:bg-white/90'
              }`}
          >
            Global
          </button>
        </div>
      </motion.div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-2xl bg-danger/15 border border-danger/30 text-danger text-sm px-4 py-3">
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="surface-card border border-black/10 rounded-2xl p-14 text-center text-text-muted tracking-tight">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            Loading the library…
          </div>
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          illustration="feed"
          title="The library is empty"
          description="Be the first to share your knowledge! Create a blog or notes post — an AI-generated audio summary will be created automatically."
          ctaLabel="Create your first post"
          onCtaClick={() => setModalOpen(true)}
        />
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
          variants={listVariants}
          initial="hidden"
          animate="show"
        >
          {posts.map((post) => (
            <motion.div key={post.id} variants={itemVariants}>
              <LibraryCard
                post={post}
                currentUserId={user?.id}
                onPatch={patchPost}
                onRemoved={removePost}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Create modal */}
      <CreateLibraryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={loadPosts}
        scope={scope}
      />
    </div>
  );
};

export default NexusLibrary;
