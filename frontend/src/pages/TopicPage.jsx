import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { generateLecture, sendChatMessage } from '../services/aiService';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Flashcards from '../components/study/Flashcards';
import ExamSimulator from '../components/study/ExamSimulator';
import MindMapViewer from '../components/study/MindMapViewer';
import PodcastPlayer from '../components/study/PodcastPlayer';
import YouTubeIngestor from '../components/upload/YouTubeIngestor';
import { FiFileText, FiStar, FiCheck, FiUser, FiLink, FiBookOpen, FiChevronDown, FiChevronUp, FiArrowLeft, FiClock, FiMessageSquare, FiSend, FiLayers, FiAward, FiYoutube, FiShare2, FiHeadphones } from 'react-icons/fi';

const TopicPage = () => {
  const { topicId } = useParams();
  const { user, refreshUser } = useAuth();
  const [topicData, setTopicData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Lecture & Chat State
  const [lectureContent, setLectureContent] = useState('');
  const [lectureLoading, setLectureLoading] = useState(false);
  const [showLecture, setShowLecture] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatContextMode, setChatContextMode] = useState('both');
  const chatBottomRef = useRef(null);

  const [showTeachMenu, setShowTeachMenu] = useState(false);
  const [expandedNote, setExpandedNote] = useState(null);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [showExam, setShowExam] = useState(false);
  const [showYouTube, setShowYouTube] = useState(false);
  const [showMindMap, setShowMindMap] = useState(false);
  const [showPodcast, setShowPodcast] = useState(false);

  useEffect(() => {
    fetchTopic();
  }, [topicId]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  const fetchTopic = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/topics/${topicId}`);
      setTopicData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTeachMe = async (mode) => {
    if (user.credits < 3) {
      alert('You need at least 3 credits to use "Teach Me". Upload notes to earn credits!');
      return;
    }

    setShowTeachMenu(false);
    setShowLecture(true);
    setShowFlashcards(false);
    setShowExam(false);
    setShowYouTube(false);
    setShowMindMap(false);
    setShowPodcast(false);
    setLectureLoading(true);
    setChatHistory([]);
    setChatContextMode(mode);
    try {
      const lecture = await generateLecture(topicId, topicData.topic.name, mode, topicData.topic.subject_name);
      setLectureContent(lecture);
      
      setChatHistory([
        { role: 'model', text: `Hi ${user.name}! I'm your AI tutor. I just generated this lecture using your ${mode === 'both' ? 'Notes and YouTube videos' : mode === 'notes' ? 'Notes' : 'YouTube videos'}. Do you have any questions?` }
      ]);

      await api.post(`/notes/1/unlock`).catch(() => {}); // Fallback simplified deduction
      refreshUser();
    } catch (err) {
      console.error(err);
      setLectureContent('Failed to generate lecture. Please check your AI backend is running.');
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
      const reply = await sendChatMessage(topicId, chatContextMode, currentHistory, userMsg.text, lectureContent);
      setChatHistory(prev => [...prev, { role: 'model', text: reply }]);
    } catch (error) {
      console.error(error);
      setChatHistory(prev => [...prev, { role: 'model', text: 'Error: Could not connect to AI Tutor.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleFlashcards = () => {
    setShowFlashcards(true);
    setShowLecture(false);
    setShowExam(false);
    setShowYouTube(false);
    setShowMindMap(false);
    setShowPodcast(false);
  };

  const handleExam = () => {
    setShowExam(true);
    setShowLecture(false);
    setShowFlashcards(false);
    setShowYouTube(false);
    setShowMindMap(false);
    setShowPodcast(false);
  };

  const handleYouTube = () => {
    setShowYouTube(true);
    setShowLecture(false);
    setShowFlashcards(false);
    setShowExam(false);
    setShowMindMap(false);
    setShowPodcast(false);
  };

  const handleMindMap = () => {
    setShowMindMap(true);
    setShowLecture(false);
    setShowFlashcards(false);
    setShowExam(false);
    setShowYouTube(false);
    setShowPodcast(false);
  };

  const handlePodcast = () => {
    setShowPodcast(true);
    setShowLecture(false);
    setShowFlashcards(false);
    setShowExam(false);
    setShowYouTube(false);
    setShowMindMap(false);
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

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-success';
    if (score >= 50) return 'text-warning';
    return 'text-danger';
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading topic..." />;
  if (!topicData) return <div className="text-center text-text-muted py-12">Topic not found.</div>;

  const { topic, subtopics, notes, relatedTopics } = topicData;

  return (
    <div className="space-y-8 animate-fadeInUp">
      {/* Header */}
      <div>
        <Link to="/explorer" className="inline-flex items-center gap-2 text-text-muted hover:text-text text-sm mb-4 transition-colors">
          <FiArrowLeft size={14} /> Back to Explorer
        </Link>
        <div className="glass-card p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs text-primary font-medium uppercase tracking-wider mb-1">{topic.subject_name}</p>
              <h1 className="text-3xl font-bold text-text">{topic.name}</h1>
              {topic.teacher_name && (
                <p className="text-sm text-text-muted mt-1 flex items-center gap-1">
                  <FiUser size={12} /> Taught by {topic.teacher_name}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap relative">
              <div className="relative">
                <button
                  onClick={() => setShowTeachMenu(!showTeachMenu)}
                  disabled={lectureLoading}
                  className="btn-gradient flex items-center gap-2 text-sm animate-pulseGlow"
                >
                  <FiBookOpen size={16} />
                  {lectureLoading ? 'Generating...' : 'Teach Me'} (3 ⚡)
                  <FiChevronDown size={14} className={`transition-transform ${showTeachMenu ? 'rotate-180' : ''}`} />
                </button>
                {/* Dropdown Menu for Context Selection */}
                {showTeachMenu && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-[#1a1b26] border border-white/10 rounded-xl shadow-2xl py-2 z-50 animate-fadeInUp">
                    <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted border-b border-white/5 mb-1">Select Context</p>
                    <button onClick={() => handleTeachMe('notes')} className="w-full text-left px-4 py-2 text-sm text-text hover:bg-white/5 flex items-center gap-2 transition-colors">
                      <FiFileText size={14} className="text-accent" /> Notes Only
                    </button>
                    <button onClick={() => handleTeachMe('youtube')} className="w-full text-left px-4 py-2 text-sm text-text hover:bg-white/5 flex items-center gap-2 transition-colors">
                      <FiYoutube size={14} className="text-danger" /> YouTube Lecture Only
                    </button>
                    <button onClick={() => handleTeachMe('both')} className="w-full text-left px-4 py-2 text-sm text-text hover:bg-white/5 flex items-center gap-2 transition-colors">
                      <FiLayers size={14} className="text-primary" /> Both (Comprehensive)
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={handleFlashcards}
                className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-accent/15 text-accent border border-accent/30 font-semibold hover:bg-accent/25 hover:border-accent/50 transition-all"
              >
                <FiLayers size={16} />
                Flashcards
              </button>
              <button
                onClick={handleExam}
                className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-primary/15 text-primary border border-primary/30 font-semibold hover:bg-primary/25 hover:border-primary/50 transition-all"
              >
                <FiAward size={16} />
                Exam (1 ⚡)
              </button>
              <button
                onClick={handleMindMap}
                className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 font-semibold hover:bg-purple-500/25 hover:border-purple-500/50 transition-all"
              >
                <FiShare2 size={16} />
                Mind Map (2 ⚡)
              </button>
              <button
                onClick={handlePodcast}
                className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 font-semibold hover:bg-indigo-500/25 hover:border-indigo-500/50 transition-all"
              >
                <FiHeadphones size={16} />
                Audio Overview (3 ⚡)
              </button>
              <Link
                to={`/upload?topicId=${topicId}`}
                className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-white/5 text-text border border-white/10 font-semibold hover:bg-white/10 transition-all"
              >
                <FiFileText size={16} />
                Upload PDF
              </Link>
              <button
                onClick={handleYouTube}
                className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-danger/15 text-danger border border-danger/30 font-semibold hover:bg-danger/25 hover:border-danger/50 transition-all"
              >
                <FiYoutube size={16} />
                Link YouTube
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Teach Me Lecture & Chat */}
      {showLecture && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lecture Viewer */}
          <div className="glass-card flex flex-col h-[600px] max-h-[75vh] min-h-0 border border-primary/20">
            <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-primary/5">
              <h2 className="text-lg font-bold text-text flex items-center gap-2">
                <FiBookOpen className="text-primary" /> Generated Lecture
              </h2>
              <button onClick={() => setShowLecture(false)} className="text-text-muted hover:text-text text-sm">Close</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar min-h-0">
              {lectureLoading ? (
                <LoadingSpinner text="AI is formulating the lecture..." />
              ) : (
                <div
                  className="lecture-content prose prose-invert max-w-none prose-p:text-text-muted prose-headings:text-text"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(lectureContent) }}
                />
              )}
            </div>
          </div>

          {/* AI Chat Tutor */}
          <div className="glass-card flex flex-col h-[600px] max-h-[75vh] min-h-0 border border-secondary/20">
            <div className="p-4 border-b border-white/5 flex items-center gap-2 shrink-0 bg-secondary/5">
              <FiMessageSquare className="text-secondary" />
              <h2 className="text-lg font-bold text-text">Tutor Chat</h2>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar space-y-4 min-h-0">
              {chatHistory.length === 0 && !lectureLoading && (
                <p className="text-center text-text-muted text-sm mt-10">Waiting for interaction...</p>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl p-3 text-sm ${
                    msg.role === 'user' 
                      ? 'bg-primary text-white rounded-tr-sm' 
                      : 'bg-white/10 text-white rounded-tl-sm border border-white/5'
                  }`}>
                    {msg.text}
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
              <div className="px-4 py-2 border-t border-white/5 bg-background/30 flex items-center gap-2">
                <span className="text-xs text-text-muted">Context Source:</span>
                <select
                  value={chatContextMode}
                  onChange={(e) => setChatContextMode(e.target.value)}
                  className="bg-white/5 border border-white/10 text-xs text-text rounded px-2 py-1 outline-none focus:border-secondary transition-colors"
                >
                  <option value="both">Both (Comprehensive)</option>
                  <option value="notes">Notes Only</option>
                  <option value="youtube">YouTube Only</option>
                </select>
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-2 p-4 pt-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question about the lecture..."
                  className="flex-1 input-glass py-2 px-4 rounded-full text-sm"
                  disabled={chatLoading || lectureLoading}
                />
                <button 
                  type="submit" 
                  disabled={!chatInput.trim() || chatLoading || lectureLoading}
                  className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center hover:bg-secondary/80 disabled:opacity-50 transition-colors"
                >
                  <FiSend size={16} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Smart Flashcards */}
      {showFlashcards && (
        <Flashcards topicId={topicId} onClose={() => setShowFlashcards(false)} />
      )}

      {/* Exam Simulator */}
      {showExam && (
        <ExamSimulator topicId={topicId} onClose={() => setShowExam(false)} refreshUser={refreshUser} />
      )}

      {/* Mind Map Viewer */}
      {showMindMap && (
        <MindMapViewer topicId={topicId} onClose={() => setShowMindMap(false)} refreshUser={refreshUser} />
      )}

      {/* Podcast Player */}
      {showPodcast && (
        <PodcastPlayer topicId={topicId} onClose={() => setShowPodcast(false)} refreshUser={refreshUser} />
      )}

      {/* YouTube Ingestor */}
      {showYouTube && (
        <YouTubeIngestor topicId={topicId} onClose={() => setShowYouTube(false)} refreshUser={refreshUser} />
      )}

      {/* Subtopics */}
      {!showLecture && !showFlashcards && !showExam && !showYouTube && !showMindMap && !showPodcast && subtopics.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-text mb-4">Subtopics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {subtopics.map((sub) => (
              <Link key={sub.id} to={`/topic/${sub.id}`} className="glass-card glass-card-hover p-4 transition-all duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                    <FiFileText size={14} className="text-accent" />
                  </div>
                  <span className="text-sm font-medium text-text">{sub.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {!showLecture && !showFlashcards && !showExam && !showYouTube && !showMindMap && !showPodcast && (
        <div>
          <h2 className="text-lg font-semibold text-text mb-4">Notes ({notes.length})</h2>
          {notes.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <FiFileText size={40} className="mx-auto text-text-muted mb-3 opacity-40" />
              <p className="text-text-muted">No notes uploaded yet for this topic.</p>
              <Link to="/upload" className="inline-block mt-4 btn-gradient text-sm">
                Upload First Note
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="glass-card overflow-hidden transition-all duration-300">
                  <div className="p-5 cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => setExpandedNote(expandedNote === note.id ? null : note.id)}>
                    <div className="flex items-center gap-4">
                      {/* Thumbnail */}
                      <div className="w-16 h-16 rounded-xl bg-background flex items-center justify-center border border-white/5 shrink-0 overflow-hidden">
                        {note.file_url ? (
                          <img
                            src={note.file_url.startsWith('http') ? note.file_url : `http://localhost:5000${note.file_url}`}
                            alt="Note"
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<svg class="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>'; }}
                          />
                        ) : (
                          <FiFileText size={24} className="text-text-muted" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-text">Note #{note.id}</span>
                          {note.is_verified && (
                            <span className="px-2 py-0.5 text-[10px] font-medium bg-success/20 text-success rounded-full flex items-center gap-1">
                              <FiCheck size={10} /> Verified
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted flex items-center gap-3">
                          <span className="flex items-center gap-1"><FiUser size={10} /> {note.uploader_name}</span>
                          <span className="flex items-center gap-1"><FiClock size={10} /> {new Date(note.created_at).toLocaleDateString()}</span>
                        </p>
                        {note.summary && <p className="text-xs text-text-muted mt-1 line-clamp-2">{note.summary}</p>}
                      </div>

                      <div className="text-center shrink-0">
                        <div className={`text-xl font-bold ${getScoreColor(note.quality_score)}`}>{note.quality_score}</div>
                        <p className="text-[10px] text-text-muted">Quality</p>
                      </div>

                      <div className="shrink-0">
                        {expandedNote === note.id ? <FiChevronUp className="text-text-muted" /> : <FiChevronDown className="text-text-muted" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedNote === note.id && (
                    <div className="border-t border-white/5 p-5 bg-background/30 space-y-4">
                      {note.summary && (
                        <div>
                          <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Summary</h4>
                          <p className="text-sm text-text-muted leading-relaxed">{note.summary}</p>
                        </div>
                      )}
                      {note.key_points && note.key_points.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">Key Points</h4>
                          <ul className="space-y-2">
                            {(typeof note.key_points === 'string' ? JSON.parse(note.key_points) : note.key_points).map((point, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                                <FiStar size={12} className="text-warning shrink-0 mt-1" />
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {note.file_url && (
                        <div>
                          <h4 className="text-xs font-semibold text-success uppercase tracking-wider mb-2">Preview</h4>
                          <img
                            src={note.file_url.startsWith('http') ? note.file_url : `http://localhost:5000${note.file_url}`}
                            alt="Note preview"
                            className="max-w-full max-h-96 rounded-xl border border-white/10"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Related Topics */}
      {!showLecture && !showFlashcards && !showExam && !showYouTube && !showMindMap && !showPodcast && relatedTopics.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
            <FiLink size={16} className="text-accent" /> Related Topics
          </h2>
          <div className="flex flex-wrap gap-3">
            {relatedTopics.map((rt) => (
              <Link
                key={rt.id}
                to={`/topic/${rt.id}`}
                className="px-4 py-2 rounded-xl bg-accent/10 border border-accent/20 text-sm text-text hover:border-accent/40 transition-all flex items-center gap-2"
              >
                <FiLink size={12} className="text-accent" />
                {rt.name}
                <span className="text-[10px] text-text-muted">({rt.relation_type})</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TopicPage;
