import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Sparkles, BookOpen, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { processYouTubeVideo, generateLecture, sendChatMessage } from '../services/aiService';
import { showToast } from '../services/toast';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageMascot from '../components/ui/PageMascot';
import { FiYoutube, FiArrowRight } from 'react-icons/fi';

const VideoLearnPage = () => {
  const { user, refreshUser } = useAuth();


  const [url, setUrl] = useState('');
  const [processing, setProcessing] = useState(false);


  const [topicId, setTopicId] = useState(null);
  const [videoId, setVideoId] = useState(null);
  const [videoMeta, setVideoMeta] = useState(null);
  const [startAt, setStartAt] = useState(0);
  const [citationsOpen, setCitationsOpen] = useState(true);


  const [lectureContent, setLectureContent] = useState('');
  const [lectureLoading, setLectureLoading] = useState(false);


  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, chatLoading]);

  const extractVideoId = (fullUrl) => {
    const match = fullUrl.match(/(?:v=|\/v\/|youtu\.be\/|embed\/|^)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  const handleStartLearning = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    const vidId = extractVideoId(url);
    if (!vidId) {
      showToast('error', 'Invalid YouTube URL. Please provide a valid link.', 'Invalid URL');
      return;
    }

    if (user.credits < 5) {
      showToast('error', 'You need at least 5 credits to process a YouTube video. Upload notes to earn more!', 'Not Enough Credits');
      return;
    }

    setProcessing(true);
    setTopicId(null);
    setLectureContent('');
    setChatHistory([]);
    setVideoId(vidId);
    setVideoMeta(null);
    setStartAt(0);

    const tempTopicId = `yt-${Date.now()}-${vidId}`;

    try {
      const meta = await processYouTubeVideo(tempTopicId, url);
      setVideoMeta(meta);
      showToast('success', 'Video processed successfully! Generating your personalized lecture...', 'Success');
      setTopicId(tempTopicId);
      refreshUser();

      try {
        await api.post('/sessions', {
          title: `YouTube Learn · ${vidId}`,
          description: 'Auto-saved from YouTube Fast-Learn.',
          starts_at: new Date().toISOString(),
          status: 'done',
          meta: {
            kind: 'youtube',
            url: url.trim(),
            videoId: vidId,
            topicId: tempTopicId,
            summary: meta?.summary || null,
            chapters: Array.isArray(meta?.chapters) ? meta.chapters : [],
          }
        });
      } catch {
      }


      handleGenerateLecture(tempTopicId);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateLecture = async (targetTopicId) => {
    setLectureLoading(true);
    try {
      const lecture = await generateLecture(targetTopicId, 'YouTube Video Lesson', 'youtube');
      setLectureContent(lecture);

      setChatHistory([
        { role: 'model', text: `Hi ${user.name}! I've analyzed this video and generated a lecture for you. What would you like to explore further?` }
      ]);
    } catch (err) {
      console.error(err);
      setLectureContent('Failed to generate lecture from video. Please try again later.');
    } finally {
      setLectureLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = { role: 'user', text: chatInput };
    const currentHistory = [...chatHistory];

    setChatHistory([...currentHistory, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const reply = await sendChatMessage(topicId, 'youtube', currentHistory, userMsg.text, lectureContent);
      setChatHistory(prev => [...prev, { role: 'model', text: reply }]);
    } catch (error) {
      console.error(error);
      setChatHistory(prev => [...prev, { role: 'model', text: 'Error: Could not connect to AI Tutor.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const renderMarkdown = (text) => {
    if (!text) return '';
    return text
      .replace(/## (.*)/g, '<h2>$1</h2>')
      .replace(/### (.*)/g, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^- (.*)/gm, '<li>$1</li>')
      .replace(/^(\d+)\. (.*)/gm, '<li>$2</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
  };

  return (
    <div className="space-y-8 animate-fadeInUp max-w-7xl mx-auto">
      <div className="glass-card p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-danger/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
          <div className="max-w-3xl min-w-0 flex-1">
            <h1 className="text-3xl font-bold text-text mb-2 flex items-center gap-3">
              <FiYoutube className="text-danger" /> YouTube Fast-Learn
            </h1>
            <p className="text-text-muted mb-6">
              Paste any educational YouTube link below to instantly generate a comprehensive lecture and chat environment. No pre-uploaded notes required. (Costs 5 ⚡)
            </p>

            <form onSubmit={handleStartLearning} className="flex flex-col sm:flex-row gap-3" aria-label="Start from a YouTube URL">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FiYoutube className="text-text-muted" size={18} />
                </div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full input-glass py-3 pl-11 pr-4 rounded-xl text-[15px]"
                  disabled={processing}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={processing || !url.trim()}
                className="btn-gradient py-3 px-6 rounded-xl flex items-center justify-center gap-2 whitespace-nowrap"
                style={processing ? { opacity: 0.7, pointerEvents: 'none' } : { background: 'linear-gradient(135deg, #ef4444, #f43f5e)' }}
              >
                {processing ? (
                  <>Processing Video <span className="animate-pulse">...</span></>
                ) : (
                  <>Start Learning <FiArrowRight /></>
                )}
              </button>
            </form>
          </div>
          <PageMascot role="videoLearn" size="lg" className="shrink-0 self-center lg:self-start lg:pt-2" />
        </div>
      </div>

      {topicId && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeInUp">

          <div className="lg:col-span-7 space-y-6">
            <div className="glass-card overflow-hidden aspect-video border border-danger/20">
              <iframe
                key={`${videoId || ''}:${startAt || 0}`}
                src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&start=${Math.max(0, Number(startAt) || 0)}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              ></iframe>
            </div>

            {Array.isArray(videoMeta?.chapters) && videoMeta.chapters.length > 0 && (
              <div className="glass-card border border-black/10 rounded-2xl overflow-hidden shadow-xl shadow-black/10">
                <div className="px-5 py-4 border-b border-black/10 bg-white/70 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-text flex items-center gap-2">
                    <MessageSquare className="text-primary" size={16} /> Chapters
                  </h3>
                  {videoMeta?.summary && (
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                      Summary ready
                    </span>
                  )}
                </div>
                <div className="p-4 space-y-2 bg-white/40">
                  {videoMeta.chapters.map((c, idx) => (
                    <button
                      key={`${c.start}-${idx}`}
                      type="button"
                      onClick={() => setStartAt(c.start)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${Number(startAt) === Number(c.start)
                        ? 'bg-primary/10 border-primary/25 text-primary'
                        : 'bg-white/70 border-black/10 text-text hover:bg-white/90'
                        }`}
                      title="Jump to time"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold truncate">{c.label}</span>
                        <span className="text-xs text-text-muted tabular-nums shrink-0">
                          {Math.floor((c.start || 0) / 60)}:{String((c.start || 0) % 60).padStart(2, '0')}
                        </span>
                      </div>
                    </button>
                  ))}
                  {videoMeta?.summary && (
                    <div className="mt-3 rounded-xl border border-black/10 bg-white/70 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Video summary</p>
                      <p className="text-sm text-text-muted leading-relaxed">{videoMeta.summary}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {Array.isArray(videoMeta?.segments) && videoMeta.segments.length > 0 && (
              <div className="glass-card border border-black/10 rounded-2xl overflow-hidden shadow-xl shadow-black/10">
                <button
                  type="button"
                  onClick={() => setCitationsOpen((v) => !v)}
                  className="w-full px-5 py-4 border-b border-black/10 bg-white/70 flex items-center justify-between gap-3 text-left"
                >
                  <div>
                    <p className="text-sm font-bold text-text">Citations (Transcript)</p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      Click a line to jump the video.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-text-muted">
                    {citationsOpen ? 'Hide' : 'Show'}
                  </span>
                </button>
                {citationsOpen && (
                  <div className="p-4 bg-white/40 max-h-[320px] overflow-y-auto custom-scrollbar space-y-2">
                    {videoMeta.segments.slice(0, 120).map((s, idx) => (
                      <button
                        key={`${s.start}-${idx}`}
                        type="button"
                        onClick={() => setStartAt(Math.floor(Number(s.start) || 0))}
                        className="w-full text-left px-4 py-3 rounded-xl border border-black/10 bg-white/70 hover:bg-white/90 transition-colors"
                        title="Jump to time"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-sm text-text-muted leading-relaxed line-clamp-2">
                            {String(s.text || '').trim()}
                          </span>
                          <span className="text-xs text-text-muted tabular-nums shrink-0">
                            {Math.floor((Number(s.start) || 0) / 60)}:{String(Math.floor(Number(s.start) || 0) % 60).padStart(2, '0')}
                          </span>
                        </div>
                      </button>
                    ))}
                    {videoMeta.segments.length > 120 && (
                      <p className="text-[11px] text-text-muted text-center pt-2">
                        Showing first 120 transcript lines.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="glass-card flex flex-col h-[500px] border border-primary/20">
              <div className="p-4 border-b border-black/10 flex items-center justify-between shrink-0 bg-primary/5">
                <h2 className="text-lg font-bold text-text tracking-tight flex items-center gap-2">
                  <BookOpen className="text-primary" size={20} strokeWidth={2} /> Generated Lecture
                </h2>
              </div>
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar min-h-0">
                {lectureLoading ? (
                  <LoadingSpinner text="AI is formulating the lecture from the transcript..." />
                ) : (
                  <div
                    className="lecture-content prose max-w-none prose-p:text-text-muted prose-headings:text-text"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(lectureContent) }}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="glass-float flex flex-col h-[calc(100vh-8rem)] max-h-[800px] border border-black/10 rounded-2xl overflow-hidden shadow-xl shadow-black/10 sticky top-24">
              <div className="px-4 py-3 border-b border-black/10 flex items-center gap-3 shrink-0 bg-white/70">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/25">
                  <Bot size={18} strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-text tracking-tight">Tutor</h2>
                  <p className="text-[10px] text-text-muted uppercase tracking-widest font-medium flex items-center gap-1">
                    <Sparkles size={10} className="text-accent" /> Video session
                  </p>
                </div>
              </div>

              <div className="p-4 overflow-y-auto flex-1 custom-scrollbar space-y-3 min-h-0 bg-white/40">
                {chatHistory.length === 0 && !lectureLoading && (
                  <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                    <div className="h-12 w-12 rounded-2xl bg-white/80 border border-black/10 flex items-center justify-center mb-3">
                      <MessageSquare size={22} className="text-text-muted opacity-60" strokeWidth={2} />
                    </div>
                    <p className="text-sm text-text-muted max-w-xs leading-relaxed">
                      Ask about the lecture or the video. Replies use the same calm, terminal-inspired bubbles as your topic tutor.
                    </p>
                  </div>
                )}
                <AnimatePresence initial={false}>
                  {chatHistory.map((msg, i) => (
                    <motion.div
                      key={`${i}-${msg.role}-${msg.text?.slice(0, 12)}`}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${msg.role === 'user'
                          ? 'chat-bubble-user rounded-tr-md'
                          : 'chat-bubble-ai rounded-tl-md text-text'
                          }`}
                      >
                        {msg.role === 'model' ? (
                          <div
                            className="[&_a]:text-primary [&_code]:text-accent"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
                          />
                        ) : (
                          msg.text
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {chatLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="max-w-[80%] rounded-2xl px-4 py-3 chat-bubble-ai flex gap-1.5 items-center">
                      <span className="w-2 h-2 rounded-full bg-primary/80 animate-bounce [animation-delay:0ms]" />
                      <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                      <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </motion.div>
                )}
                <div ref={chatBottomRef} />
              </div>

              <div className="border-t border-black/10 shrink-0 bg-white/70 backdrop-blur-md p-3">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about the video…"
                    className="flex-1 input-premium py-2.5 px-4 rounded-full text-sm"
                    disabled={chatLoading || lectureLoading}
                  />
                  <motion.button
                    type="submit"
                    disabled={!chatInput.trim() || chatLoading || lectureLoading}
                    whileHover={{ scale: 1 }}
                    whileTap={{ scale: 1 }}
                    className="w-11 h-11 rounded-full btn-ai-primary flex items-center justify-center disabled:opacity-40 shrink-0 border-0 p-0"
                  >
                    <Send size={18} strokeWidth={2} />
                  </motion.button>
                </form>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default VideoLearnPage;
