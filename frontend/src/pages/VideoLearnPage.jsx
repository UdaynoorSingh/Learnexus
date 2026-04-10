import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { processYouTubeVideo, generateLecture, sendChatMessage } from '../services/aiService';
import { showToast } from '../services/toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { FiYoutube, FiArrowRight, FiBookOpen, FiMessageSquare, FiSend } from 'react-icons/fi';

const VideoLearnPage = () => {
  const { user, refreshUser } = useAuth();
  
  
  const [url, setUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  
  
  const [topicId, setTopicId] = useState(null);
  const [videoId, setVideoId] = useState(null);
  
  
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
  }, [chatHistory]);

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

    const tempTopicId = `yt-${Date.now()}-${vidId}`; 
    
    try {
      await processYouTubeVideo(tempTopicId, url);
      showToast('success', 'Video processed successfully! Generating your personalized lecture...', 'Success');
      setTopicId(tempTopicId);
      refreshUser();
      
      
      handleGenerateLecture(tempTopicId);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || err.message || 'Failed to process video.';
      showToast('error', msg, 'Processing Failed');
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
      {}
      <div className="glass-card p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-danger/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl">
          <h1 className="text-3xl font-bold text-text mb-2 flex items-center gap-3">
            <FiYoutube className="text-danger" /> YouTube Fast-Learn
          </h1>
          <p className="text-text-muted mb-6">
            Paste any educational YouTube link below to instantly generate a comprehensive lecture and chat environment. No pre-uploaded notes required. (Costs 5 ⚡)
          </p>
          
          <form onSubmit={handleStartLearning} className="flex flex-col sm:flex-row gap-3">
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
      </div>

      {}
      {topicId && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeInUp">
          
          {}
          <div className="lg:col-span-7 space-y-6">
            {}
            <div className="glass-card overflow-hidden aspect-video border border-danger/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              ></iframe>
            </div>

            {}
            <div className="glass-card flex flex-col h-[500px] border border-primary/20">
              <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-primary/5">
                <h2 className="text-lg font-bold text-text flex items-center gap-2">
                  <FiBookOpen className="text-primary" /> Generated Lecture
                </h2>
              </div>
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar min-h-0">
                {lectureLoading ? (
                  <LoadingSpinner text="AI is formulating the lecture from the transcript..." />
                ) : (
                  <div
                    className="lecture-content prose prose-invert max-w-none prose-p:text-text-muted prose-headings:text-text"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(lectureContent) }}
                  />
                )}
              </div>
            </div>
          </div>

          {}
          <div className="lg:col-span-5">
            <div className="glass-card flex flex-col h-full min-h-[600px] border border-secondary/20 sticky top-24">
              <div className="p-4 border-b border-white/5 flex items-center gap-2 shrink-0 bg-secondary/5">
                <FiMessageSquare className="text-secondary" />
                <h2 className="text-lg font-bold text-text">Tutor Chat</h2>
              </div>
              
              <div className="p-4 overflow-y-auto flex-1 custom-scrollbar space-y-4 min-h-0">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-3 text-[14px] leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-secondary text-white rounded-tr-sm shadow-md' 
                        : 'bg-white/10 text-white rounded-tl-sm border border-white/10'
                    }`}>
                      {msg.role === 'model' ? (
                        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }} />
                      ) : (
                        msg.text
                      )}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl p-3 bg-white/5 text-text-muted rounded-tl-sm border border-white/5 flex gap-1 items-center">
                      <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce delay-100"></span>
                      <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce delay-200"></span>
                      <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce delay-300"></span>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              <div className="p-4 border-t border-white/5 shrink-0 bg-background/50">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about the video..."
                    className="flex-1 input-glass py-2.5 px-4 rounded-full text-sm"
                    disabled={chatLoading || lectureLoading}
                  />
                  <button 
                    type="submit" 
                    disabled={!chatInput.trim() || chatLoading || lectureLoading}
                    className="w-11 h-11 rounded-full bg-secondary text-white flex items-center justify-center hover:bg-secondary/80 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                  >
                    <FiSend size={18} />
                  </button>
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
