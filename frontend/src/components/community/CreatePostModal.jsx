import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Upload } from 'lucide-react';
import { createPost, uploadCommunityImage } from '../../services/communityService';
import { showToast } from '../../services/toast';
import { useAuth } from '../../context/AuthContext';

const CreatePostModal = ({ open, onClose, onCreated, postCollegeId = null }) => {
  const { refreshUser } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [bounty, setBounty] = useState(0);
  const [postAnonymously, setPostAnonymously] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const revokePreview = (url) => {
    if (url) URL.revokeObjectURL(url);
  };

  const clearLocalImage = () => {
    setImagePreview((prev) => {
      revokePreview(prev);
      return null;
    });
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    if (open) {
      setTitle('');
      setContent('');
      setImageUrl('');
      setImagePreview((prev) => {
        revokePreview(prev);
        return null;
      });
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setBounty(0);
      setPostAnonymously(false);
      setError('');
    }
  }, [open]);

  const spring = { type: 'spring', stiffness: 400, damping: 32 };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) {
      clearLocalImage();
      return;
    }
    setImageUrl('');
    setImagePreview((prev) => {
      revokePreview(prev);
      return URL.createObjectURL(f);
    });
    setImageFile(f);
  };

  const handleUrlChange = (e) => {
    const v = e.target.value;
    setImageUrl(v);
    if (v.trim()) clearLocalImage();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      let finalImageUrl = imageUrl.trim() || undefined;
      if (imageFile) {
        finalImageUrl = await uploadCommunityImage(imageFile);
      }
      await createPost({
        title: title.trim(),
        content: content.trim(),
        image_url: finalImageUrl,
        bounty: Number(bounty) || 0,
        is_anonymous: postAnonymously,
        ...(postCollegeId != null ? { college_id: postCollegeId } : {})
      });
      await refreshUser();
      onCreated?.();
      onClose();
    } catch (err) {
      const data = err.response?.data;
      const toxic = err.response?.status === 400 && data?.toxic === true;
      if (toxic) {
        showToast(
          'error',
          'Your post was blocked and was not published. A 10 credit toxicity penalty was applied to your account.',
          'Content blocked'
        );
        await refreshUser();
      }
      const msg = data?.error || err.message || 'Failed to create post';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

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
            className="relative w-full max-w-lg glass-float border border-white/10 shadow-2xl shadow-black/50 rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-surface/40">
          <h2 className="text-lg font-bold text-text tracking-tight">Create post</h2>
          <motion.button
            type="button"
            onClick={onClose}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={spring}
            className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-white/5 transition-colors"
          >
            <X size={20} strokeWidth={2} />
          </motion.button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto px-6 py-4 space-y-4">
            {error && (
              <div className="rounded-xl bg-danger/15 border border-danger/30 text-danger text-sm px-4 py-2">
                {error}
              </div>
            )}

            <p className="text-[11px] text-text-muted rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
              Your post is automatically placed in the best matching channel using AI tag normalization.
            </p>

            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl input-premium px-4 py-2.5 text-text placeholder:text-text-muted/50"
                placeholder="What do you want to ask or share?"
                maxLength={500}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                Content
              </label>
              <p className="text-[11px] text-text-muted mb-2">
                Markdown supported: **bold**, lists, and fenced code blocks (e.g. ```cpp for C++).
              </p>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="w-full rounded-xl input-premium px-4 py-2.5 text-text placeholder:text-text-muted/50 resize-y min-h-[120px] font-mono text-sm"
                placeholder={'Explain your question…\n\n```cpp\nint main() { return 0; }\n```'}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                Image (optional)
              </label>
              <p className="text-[11px] text-text-muted mb-2">
                Upload from your device, or paste a link. If you do both, the uploaded file is used.
              </p>

              <div className="rounded-xl border border-white/10 bg-background/50 p-4 space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  id="nexus-post-image-file"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="nexus-post-image-file"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors"
                  >
                    <Upload size={16} strokeWidth={2} />
                    Choose image
                  </label>
                  {imageFile && (
                    <button
                      type="button"
                      onClick={clearLocalImage}
                      className="text-xs text-text-muted hover:text-danger transition-colors"
                    >
                      Remove file
                    </button>
                  )}
                </div>

                {imagePreview && (
                  <div className="relative rounded-lg overflow-hidden border border-white/10 max-h-40 w-full bg-black/20">
                    <img src={imagePreview} alt="" className="w-full h-full max-h-40 object-contain" />
                  </div>
                )}

                <div className="flex items-center gap-2 text-text-muted text-xs">
                  <span className="shrink-0">or</span>
                  <div className="h-px flex-1 bg-white/10" />
                  <ImageIcon size={12} strokeWidth={2} className="shrink-0" />
                </div>

                <input
                  type="url"
                  value={imageUrl}
                  onChange={handleUrlChange}
                  disabled={!!imageFile}
                  className="w-full rounded-xl input-premium px-4 py-2.5 text-text placeholder:text-text-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="https://…"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-background/50 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text">Post Anonymously (Costs 2 ⚡)</p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Your name is hidden as &quot;Anonymous Learner&quot; on the feed.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={postAnonymously}
                onClick={() => setPostAnonymously((v) => !v)}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                  postAnonymously
                    ? 'bg-primary border-primary/40'
                    : 'bg-white/10 border-white/15'
                }`}
              >
                <span
                  aria-hidden
                  className={`pointer-events-none absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-out ${
                    postAnonymously ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                Bounty amount (⚡)
              </label>
              <input
                type="number"
                min={0}
                value={bounty}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '') setBounty(0);
                  else setBounty(Math.max(0, parseInt(v, 10) || 0));
                }}
                className="w-full rounded-xl input-premium px-4 py-2.5 text-text"
                placeholder="0"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-white/10 bg-surface/30 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:text-text hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-gradient px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Posting…' : 'Publish'}
            </button>
          </div>
        </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreatePostModal;
