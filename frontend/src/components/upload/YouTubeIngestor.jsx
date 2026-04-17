import { useState } from 'react';
import { processYouTubeVideo } from '../../services/aiService';
import { FiYoutube, FiCheck, FiAlertCircle, FiLoader, FiX, FiZap } from 'react-icons/fi';

const YouTubeIngestor = ({ topicId, onClose, onSuccess, refreshUser }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [creditError, setCreditError] = useState(false);
  const [result, setResult] = useState(null);

  const isValidYouTubeUrl = (input) => {
    return /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}/.test(input);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim() || loading) return;

    if (!isValidYouTubeUrl(url)) {
      setError('Please enter a valid YouTube URL.');
      return;
    }

    setLoading(true);
    setError(null);
    setCreditError(false);
    setResult(null);

    try {
      const data = await processYouTubeVideo(topicId, url);
      setResult(data);
      setUrl('');
      if (refreshUser) refreshUser();
      if (onSuccess) onSuccess(data);
    } catch (err) {
      if (err.response?.status === 403) {
        setCreditError(true);
        setError(err.response?.data?.error || 'Not enough credits! You need 5 credits to process a YouTube video.');
      } else {
        setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to process YouTube video.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card border border-danger/20 overflow-hidden animate-fadeInUp">
      <div className="p-4 border-b border-black/10 flex items-center justify-between bg-danger/5">
        <h2 className="text-lg font-bold text-text flex items-center gap-2">
          <FiYoutube className="text-danger" /> YouTube to Knowledge Base
        </h2>
        <button onClick={onClose} className="text-text-muted hover:text-text transition-colors">
          <FiX size={18} />
        </button>
      </div>

      <div className="p-6">
        <p className="text-sm text-text-muted mb-5 leading-relaxed">
          Paste a YouTube lecture URL below. The AI will download the transcript, chunk it, and embed it into your
          FAISS vector database — making it available for <span className="text-accent font-medium">Flashcards</span>,{' '}
          <span className="text-primary font-medium">Exams</span>, and{' '}
          <span className="text-text font-medium">Tutor Chat</span>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FiYoutube size={18} className="text-danger/60" />
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(null); setCreditError(false); setResult(null); }}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/80 border border-black/10 text-text text-sm placeholder:text-text-muted/50 focus:outline-none focus:border-danger/40 focus:ring-2 focus:ring-danger/15 transition-all"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={!url.trim() || loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: loading ? 'rgba(239, 68, 68, 0.15)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: 'white',
              border: loading ? '1px solid rgba(239, 68, 68, 0.3)' : 'none'
            }}
          >
            {loading ? (
              <>
                <FiLoader size={16} className="animate-spin" />
                Processing video transcript...
              </>
            ) : (
              <>
                <FiZap size={16} />
                Embed Video (5 ⚡)
              </>
            )}
          </button>
        </form>

        {error && (
          <div className={`mt-4 p-4 rounded-xl border animate-fadeInUp flex items-start gap-3 ${
            creditError
              ? 'bg-warning/10 border-warning/20'
              : 'bg-danger/10 border-danger/20'
          }`}>
            <FiAlertCircle size={18} className={`shrink-0 mt-0.5 ${creditError ? 'text-warning' : 'text-danger'}`} />
            <div>
              <p className={`text-sm font-semibold ${creditError ? 'text-warning' : 'text-danger'}`}>
                {creditError ? 'Insufficient Credits' : 'Error'}
              </p>
              <p className="text-xs text-text-muted mt-1">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="mt-4 p-4 rounded-xl bg-success/10 border border-success/20 animate-fadeInUp">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center shrink-0">
                <FiCheck size={16} className="text-success" />
              </div>
              <div>
                <p className="text-sm font-semibold text-success mb-1">Successfully Embedded!</p>
                <p className="text-xs text-text-muted leading-relaxed">{result.message}</p>
                {result.summary && (
                  <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/5">
                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">Video Summary</p>
                    <p className="text-xs text-text leading-relaxed">{result.summary}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default YouTubeIngestor;
