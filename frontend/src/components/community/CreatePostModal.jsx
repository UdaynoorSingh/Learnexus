import { useState, useEffect, useRef } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { createPost, uploadCommunityImage } from '../../services/communityService';
import { showToast } from '../../services/toast';
import { useAuth } from '../../context/AuthContext';
import ModalShell from '../ui/ModalShell';
import Button from '../ui/Button';

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
    <ModalShell
      open={open}
      onClose={onClose}
      title="Create post"
      subtitle="Auto-tagged with AI channel normalization"
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="soft" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-post-form" disabled={submitting}>
            {submitting ? 'Posting…' : 'Publish'}
          </Button>
        </>
      }
    >
      <form id="create-post-form" onSubmit={handleSubmit} className="space-y-4">
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

              <div className="rounded-xl border border-black/10 bg-white/60 p-4 space-y-3">
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
                  <div className="relative rounded-lg overflow-hidden border border-black/10 max-h-40 w-full bg-white/60">
                    <img src={imagePreview} alt="" className="w-full h-full max-h-40 object-contain" />
                  </div>
                )}

                <div className="flex items-center gap-2 text-text-muted text-xs">
                  <span className="shrink-0">or</span>
                  <div className="h-px flex-1 bg-black/10" />
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

            <div className="flex items-center justify-between gap-4 rounded-xl border border-black/10 bg-white/60 px-4 py-3">
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
                    : 'bg-white/80 border-black/10'
                }`}
              >
                <span
                  aria-hidden
                  className={`pointer-events-none absolute top-1 left-1 h-5 w-5 rounded-full bg-surface-light shadow transition-transform duration-200 ease-out ${
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
      </form>
    </ModalShell>
  );
};

export default CreatePostModal;
