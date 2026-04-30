import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Hash, Send, X, Radio } from 'lucide-react';
import {
  fetchPosts,
  fetchForumTags,
  mascotChat,
  fetchPublicColleges
} from '../services/communityService';
import { FALLBACK_FORUM_TAGS } from '../constants/nexusTags';
import CreatePostModal from '../components/community/CreatePostModal';
import PostCard from '../components/community/PostCard';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import PageMascot from '../components/ui/PageMascot';
import { getPageMascot } from '../constants/mascots';
import Button from '../components/ui/Button';

const spring = { type: 'spring', stiffness: 380, damping: 30 };

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.06 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 380, damping: 28 }
  }
};

const NexusBoard = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [feedTab, setFeedTab] = useState('global');
  const [exploreCollegeId, setExploreCollegeId] = useState(null);
  const [allColleges, setAllColleges] = useState([]);

  const [filterTags, setFilterTags] = useState(['#All', ...FALLBACK_FORUM_TAGS]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState('#All');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [mascotOpen, setMascotOpen] = useState(false);
  const [mascotMessages, setMascotMessages] = useState([]);
  const [mascotInput, setMascotInput] = useState('');
  const [mascotLoading, setMascotLoading] = useState(false);
  const mascotBottomRef = useRef(null);

  const tagApiParams = useMemo(() => {
    if (feedTab === 'global') return { bucket: 'global' };
    if (feedTab === 'college') return { bucket: 'college' };
    if (feedTab === 'explore' && exploreCollegeId != null) {
      return { bucket: 'college', collegeId: exploreCollegeId };
    }
    return { bucket: 'college' };
  }, [feedTab, exploreCollegeId]);

  const postsScope = useMemo(() => {
    if (feedTab === 'global') return 'global';
    if (feedTab === 'college') return 'college';
    if (feedTab === 'explore' && exploreCollegeId != null) return String(exploreCollegeId);
    return 'college';
  }, [feedTab, exploreCollegeId]);

  const feedReadOnly = useMemo(() => {
    if (feedTab !== 'explore' || exploreCollegeId == null || user?.college_id == null) {
      return false;
    }
    return exploreCollegeId !== user.college_id;
  }, [feedTab, exploreCollegeId, user?.college_id]);

  const postCollegeForModal = useMemo(() => {
    if (feedReadOnly) return null;
    if (feedTab === 'global') return null;
    if (feedTab === 'college') return user?.college_id ?? null;
    if (feedTab === 'explore' && exploreCollegeId === user?.college_id) return user.college_id;
    return null;
  }, [feedTab, exploreCollegeId, user?.college_id, feedReadOnly]);

  const canCreatePost =
    !feedReadOnly && (feedTab !== 'explore' || exploreCollegeId != null);

  const showCreateButton = canCreatePost;

  const inSpecificRoom = selectedTag !== '#All';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchPublicColleges();
        if (!cancelled && Array.isArray(list)) setAllColleges(list);
      } catch {
        if (!cancelled) setAllColleges([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setMascotOpen(false);
  }, [selectedTag]);

  useEffect(() => {
    if (mascotOpen && mascotBottomRef.current) {
      mascotBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mascotOpen, mascotMessages, mascotLoading]);

  const openMascot = () => {
    setMascotOpen(true);
    setMascotMessages([
      {
        role: 'model',
        text: `Hi! I'm the Room Mascot for ${selectedTag}. I learn from threads marked solved in this room. Ask a question — I'll stick to what past solutions covered.`
      }
    ]);
    setMascotInput('');
  };

  const toggleMascot = () => {
    if (mascotOpen) {
      setMascotOpen(false);
      return;
    }
    openMascot();
  };

  const sendMascotMessage = async (e) => {
    e.preventDefault();
    const text = mascotInput.trim();
    if (!text || mascotLoading || !inSpecificRoom) return;
    setMascotInput('');
    setMascotMessages((prev) => [...prev, { role: 'user', text }]);
    setMascotLoading(true);
    try {
      const { reply } = await mascotChat(selectedTag, text);
      setMascotMessages((prev) => [...prev, { role: 'model', text: reply || 'No reply returned.' }]);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Could not reach the Room Mascot.';
      setMascotMessages((prev) => [...prev, { role: 'model', text: msg }]);
    } finally {
      setMascotLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTagsLoading(true);
      try {
        const { tags } = await fetchForumTags(tagApiParams);
        if (cancelled) return;
        const sorted =
          Array.isArray(tags) && tags.length > 0
            ? [...new Set(tags)].sort((a, b) => a.localeCompare(b))
            : [...FALLBACK_FORUM_TAGS];
        const raw = searchParams.get('tag');
        if (raw) {
          const normalized = decodeURIComponent(raw).trim();
          const t = normalized.startsWith('#') ? normalized : `#${normalized}`;
          const rest = sorted.filter((x) => x !== t).sort((a, b) => a.localeCompare(b));
          setFilterTags(['#All', t, ...rest]);
          setSelectedTag(t);
        } else {
          setFilterTags(['#All', ...sorted]);
          setSelectedTag('#All');
        }
      } catch {
        if (!cancelled) {
          const sorted = [...FALLBACK_FORUM_TAGS];
          const raw = searchParams.get('tag');
          if (raw) {
            const normalized = decodeURIComponent(raw).trim();
            const t = normalized.startsWith('#') ? normalized : `#${normalized}`;
            setFilterTags(['#All', t, ...sorted.filter((x) => x !== t)]);
            setSelectedTag(t);
          } else {
            setFilterTags(['#All', ...sorted]);
            setSelectedTag('#All');
          }
        }
      } finally {
        if (!cancelled) setTagsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, tagApiParams]);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (feedTab === 'explore' && exploreCollegeId == null) {
        setPosts([]);
        return;
      }
      const data = await fetchPosts({
        tag: selectedTag,
        scope: postsScope
      });
      setPosts(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not load the feed.');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTag, postsScope, feedTab, exploreCollegeId]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const patchPost = useCallback((id, partial) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...partial } : p)));
  }, []);

  const removePost = useCallback((id) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const collegeLabel =
    user?.college_name || (user?.college_id != null ? `College #${user.college_id}` : 'My college');

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 min-h-[calc(100vh-4rem)]">
      <main className="flex-1 min-w-0 relative">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="flex flex-col gap-4 mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 min-w-0 pr-2 sm:pr-4">
            <div className="min-w-0">
              <h1 className="text-3xl sm:text-4xl font-bold text-text tracking-tight">Nexus Board</h1>
              <p className="text-text-muted text-sm mt-2 max-w-xl leading-relaxed">
                Global and college rooms — post where you belong; explore other campuses read-only.
              </p>
            </div>
            <PageMascot role="nexusBoard" size="md" className="shrink-0 self-start sm:self-center" hideOnMobile />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setFeedTab('global');
                setExploreCollegeId(null);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${feedTab === 'global'
                ? 'bg-primary/15 border-primary/30 text-primary'
                : 'bg-white/70 border-black/10 text-text-muted hover:text-text hover:bg-white/90'
                }`}
            >
              Global Nexus
            </button>
            <button
              type="button"
              onClick={() => {
                setFeedTab('college');
                setExploreCollegeId(null);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors max-w-[14rem] truncate ${feedTab === 'college'
                ? 'bg-primary/15 border-primary/30 text-primary'
                : 'bg-white/70 border-black/10 text-text-muted hover:text-text hover:bg-white/90'
                }`}
              title={collegeLabel}
            >
              {collegeLabel} Nexus
            </button>
            <button
              type="button"
              onClick={() => setFeedTab('explore')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${feedTab === 'explore'
                ? 'bg-primary/15 border-primary/30 text-primary'
                : 'bg-white/70 border-black/10 text-text-muted hover:text-text hover:bg-white/90'
                }`}
            >
              Explore other colleges
            </button>
          </div>

          {feedTab === 'explore' && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                College
              </label>
              <select
                value={exploreCollegeId ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setExploreCollegeId(v === '' ? null : parseInt(v, 10));
                }}
                className="border border-black/10 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none bg-white/80 text-text py-2 px-3 text-sm min-w-[12rem]"
              >
                <option value="">Select a college…</option>
                {allColleges.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {feedReadOnly && exploreCollegeId != null && (
                <span className="text-xs text-amber-400/90 font-medium">
                  Read-only: upvote and Mascot only
                </span>
              )}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8"
        >
          <div className="min-w-0 sm:flex-1" />
          <div className="flex flex-wrap items-center gap-2 shrink-0 sm:pt-1">
            {inSpecificRoom && (
              <motion.button
                type="button"
                onClick={toggleMascot}
                whileHover={{ scale: 1 }}
                whileTap={{ scale: 1 }}
                transition={spring}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
              >
                <span aria-hidden>🤖</span>
                Room Mascot
              </motion.button>
            )}
            {showCreateButton && (
              <Button
                type="button"
                onClick={() => setModalOpen(true)}
                className="px-6 py-3.5 rounded-xl shadow-lg"
              >
                <Plus size={18} strokeWidth={2.5} />
                Create post
              </Button>
            )}
          </div>
        </motion.div>

        <AnimatePresence>
          {mascotOpen && inSpecificRoom && (
            <>
              <motion.button
                type="button"
                aria-label="Close Room Mascot"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 modal-backdrop"
                onClick={() => setMascotOpen(false)}
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="mascot-title"
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={spring}
                className="fixed z-50 bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-[min(100vw-3rem,22rem)] glass-card border border-black/10 shadow-xl shadow-black/10 rounded-2xl flex flex-col max-h-[min(70vh,28rem)] overflow-hidden"
              >
                <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-black/10 bg-white/70">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-primary/20 shrink-0 overflow-hidden">
                      <img
                        src={getPageMascot('nexusBoard').src}
                        alt=""
                        className="w-full h-full object-cover object-top scale-110"
                        draggable={false}
                      />
                    </div>
                    <div className="min-w-0">
                      <h2 id="mascot-title" className="text-sm font-bold text-text tracking-tight truncate">
                        Room Mascot
                      </h2>
                      <p className="text-[10px] text-text-muted truncate font-medium">{selectedTag}</p>
                    </div>
                  </div>
                  <motion.button
                    type="button"
                    onClick={() => setMascotOpen(false)}
                    whileHover={{ scale: 1 }}
                    whileTap={{ scale: 1 }}
                    className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-black/5 shrink-0"
                  >
                    <X size={18} strokeWidth={2} />
                  </motion.button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-3 min-h-[10rem] max-h-[40vh] bg-white/50">
                  {mascotMessages.map((msg, i) => (
                    <div
                      key={`${i}-${msg.role}`}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                          ? 'bg-primary text-white rounded-tr-md'
                          : 'chat-bubble-ai rounded-tl-md text-text'
                          }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {mascotLoading && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl px-3 py-2 chat-bubble-ai flex gap-1.5 items-center text-xs text-text-muted">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  )}
                  <div ref={mascotBottomRef} />
                </div>
                <form
                  onSubmit={sendMascotMessage}
                  className="flex gap-2 p-3 border-t border-black/10 bg-white/70 backdrop-blur-md"
                >
                  <input
                    type="text"
                    value={mascotInput}
                    onChange={(e) => setMascotInput(e.target.value)}
                    placeholder="Ask about this room…"
                    className="flex-1 border border-black/10 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none bg-white/80 text-text py-2.5 px-3 text-sm"
                    disabled={mascotLoading}
                  />
                  <motion.button
                    type="submit"
                    disabled={mascotLoading || !mascotInput.trim()}
                    whileHover={{ scale: 1 }}
                    whileTap={{ scale: 1 }}
                    className="w-10 h-10 rounded-xl bg-primary text-white hover:opacity-90 flex items-center justify-center disabled:opacity-40 shrink-0 border-0 p-0"
                  >
                    <Send size={16} strokeWidth={2} />
                  </motion.button>
                </form>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {error && (
          <div className="mb-4 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm px-4 py-3">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white/70 shadow-sm">
            <LoadingSpinner size="lg" text="Loading posts…" />
          </div>
        ) : feedTab === 'explore' && exploreCollegeId == null ? (
          <EmptyState
            illustration="feed"
            title="Choose a college to explore"
            description="Pick an institution from the dropdown to browse its Nexus feed. Other colleges are read-only (upvotes and Room Mascot still work)."
          />
        ) : posts.length === 0 ? (
          <EmptyState
            illustration="feed"
            title="No threads in this room yet"
            description="Start a discussion — your post is auto-tagged by AI so the right peers can find it."
            ctaLabel={showCreateButton ? 'Create your first post' : undefined}
            onCtaClick={showCreateButton ? () => setModalOpen(true) : undefined}
          />
        ) : (
          <motion.div className="space-y-5" variants={listVariants} initial="hidden" animate="show">
            {posts.map((post) => (
              <motion.div key={post.id} variants={itemVariants}>
                <PostCard
                  post={post}
                  onPatchPost={patchPost}
                  onRemoved={removePost}
                  readOnly={feedReadOnly}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>

      <aside className="w-full lg:w-[17.5rem] xl:w-72 shrink-0">
        <div className="lg:sticky lg:top-4 max-h-none lg:max-h-[calc(100vh-5rem)] flex flex-col gap-3">
          <div className="rounded-none p-[1px] bg-gradient-to-b from-white/[0.14] via-white/[0.06] to-transparent shadow-[0_12px_48px_rgba(0,0,0,0.55)]">
            <div className="rounded-2xl bg-white/90 border border-black/10 overflow-hidden flex flex-col max-h-[min(55vh,22rem)] lg:max-h-[calc(100vh-5.5rem)]">
              <div className="px-4 pt-4 pb-3 border-b border-black/10 bg-gradient-to-br from-primary/[0.08] via-transparent to-secondary/[0.06] shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/90 mb-2">Nexus</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 border border-black/10 text-primary shadow-inner">
                    <Hash size={18} strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-text tracking-tight">Rooms</h2>
                    <p className="text-[11px] text-text-muted leading-snug mt-0.5">
                      Jump to a tag. AI routes new posts here.
                    </p>
                  </div>
                </div>
                {tagsLoading && (
                  <p className="text-[10px] text-text-muted mt-2 font-medium">Syncing tags…</p>
                )}
              </div>
              <ul className="overflow-y-auto flex-1 min-h-0 py-2 px-2 custom-scrollbar space-y-0.5">
                {filterTags.map((tag) => {
                  const active = selectedTag === tag;
                  return (
                    <li key={tag}>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1 }}
                        whileTap={{ scale: 1 }}
                        transition={spring}
                        onClick={() => {
                          setSelectedTag(tag);
                          if (tag === '#All') setSearchParams({});
                          else setSearchParams({ tag });
                        }}
                        className={`group w-full text-left rounded-xl pl-2 pr-3 py-2.5 flex items-center gap-2.5 transition-all border ${active
                          ? 'bg-primary/[0.14] border-primary/30 text-primary nav-active-glow'
                          : 'border-transparent text-text-muted hover:text-text hover:bg-black/[0.03] hover:border-black/10'
                          }`}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors ${active
                            ? 'border-primary/30 bg-primary/15 text-primary'
                            : 'border-black/10 bg-white/70 text-text-muted group-hover:border-black/15'
                            }`}
                        >
                          {active ? (
                            <Radio className="h-3.5 w-3.5" strokeWidth={2.5} />
                          ) : (
                            <span className="text-[10px] font-mono opacity-70">#</span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-medium tracking-tight truncate">{tag}</span>
                      </motion.button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </aside>

      <CreatePostModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={loadPosts}
        postCollegeId={postCollegeForModal}
      />
    </div>
  );
};

export default NexusBoard;
