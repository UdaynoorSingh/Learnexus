import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Library, Plus, Headphones, Sparkles, RefreshCw } from 'lucide-react';
import { fetchLibraryPosts } from '../services/libraryService';
import LibraryCard from '../components/library/LibraryCard';
import CreateLibraryModal from '../components/library/CreateLibraryModal';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageMascot from '../components/ui/PageMascot';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Chip from '../components/ui/Chip';

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
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="mb-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
              <Library size={28} strokeWidth={1.8} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold text-text tracking-tight">
                Nexus Library
              </h1>
              <p className="text-text-muted text-sm mt-1 max-w-xl leading-relaxed">
                Community-curated blogs & notes with AI-generated audio summaries. Learn on the go.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-end">
            <div className="hidden sm:block">
              <PageMascot role="nexusLibrary" size="md" />
            </div>
            <Button type="button" onClick={() => setModalOpen(true)} className="px-6 py-3.5 rounded-xl shadow-lg">
              <Plus size={18} strokeWidth={2.5} />
              New Post
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Chip variant="primary" className="px-3.5 py-2 rounded-xl text-sm font-medium">
            <Headphones size={15} strokeWidth={2} />
            <span className="tabular-nums">{posts.length}</span> posts
          </Chip>
          <Chip variant="accent" className="px-3.5 py-2 rounded-xl text-sm font-medium">
            <Sparkles size={15} strokeWidth={2} />
            AI Audio
          </Chip>
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

          <Button
            type="button"
            onClick={() => setModalOpen(true)}
            className="sm:hidden px-4 py-2 rounded-xl shadow-lg ml-auto"
          >
            <Plus size={16} strokeWidth={2.5} />
            New
          </Button>
        </div>

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

      {error && (
        <div className="mb-4 rounded-2xl bg-danger/15 border border-danger/30 text-danger text-sm px-4 py-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white/70 shadow-sm">
          <LoadingSpinner size="lg" text="Loading the library…" />
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
