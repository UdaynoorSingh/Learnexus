import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Sparkles } from 'lucide-react';
import api from '../services/api';
import { generateLecture, sendChatMessage } from '../services/aiService';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { academicCatalogParams } from '../utils/academicCatalog';
import EmptyState from '../components/ui/EmptyState';
import Flashcards from '../components/study/Flashcards';
import ExamSimulator from '../components/study/ExamSimulator';
import MindMapViewer from '../components/study/MindMapViewer';
import PodcastPlayer from '../components/study/PodcastPlayer';
import YouTubeIngestor from '../components/upload/YouTubeIngestor';
import NoteViewerModal from '../components/common/NoteViewerModal';
import { FiFileText, FiStar, FiCheck, FiUser, FiLink, FiBookOpen, FiChevronDown, FiChevronUp, FiArrowLeft, FiClock, FiMessageSquare, FiLayers, FiAward, FiYoutube, FiShare2, FiHeadphones, FiExternalLink } from 'react-icons/fi';

const TopicPage = () => {
  const { topicId } = useParams();
  const { user, refreshUser } = useAuth();
  const [topicData, setTopicData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [lectureContent, setLectureContent] = useState('');
  const [lectureLoading, setLectureLoading] = useState(false);
  const [showLecture, setShowLecture] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatContextMode, setChatContextMode] = useState('both');
  const chatBottomRef = useRef(null);
  const teachMenuRef = useRef(null);

  const [showTeachMenu, setShowTeachMenu] = useState(false);
  const [expandedNote, setExpandedNote] = useState(null);
  const [viewingNoteUrl, setViewingNoteUrl] = useState(null);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [showExam, setShowExam] = useState(false);
  const [showYouTube, setShowYouTube] = useState(false);
  const [showMindMap, setShowMindMap] = useState(false);
  const [showPodcast, setShowPodcast] = useState(false);

  useEffect(() => {
    fetchTopic();
  }, [topicId, user?.college_id, user?.role]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, chatLoading]);

  useEffect(() => {
    if (!showTeachMenu) return;
    const onMouseDown = (e) => {
      if (teachMenuRef.current && !teachMenuRef.current.contains(e.target)) {
        setShowTeachMenu(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setShowTeachMenu(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showTeachMenu]);

  const fetchTopic = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/topics/${topicId}`, { params: academicCatalogParams(user) });
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

      await api.post(`/notes/1/unlock`).catch(() => { });
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
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading topic..." />;
  if (!topicData) return <div className="text-center text-zinc-500 py-12">Topic not found.</div>;

  const { topic, subtopics, notes, relatedTopics } = topicData;

  const actionBtnClass =
    'inline-flex items-center justify-center gap-2 text-sm font-semibold rounded-none border transition-all whitespace-nowrap px-3 py-2 sm:px-4 sm:py-2.5 shrink-0';

  return (
    <div className="space-y-8 animate-fadeInUp max-w-full min-w-0">
      <div className="min-w-0">
        <Link to="/explorer" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 text-sm mb-4 transition-colors">
          <FiArrowLeft size={14} /> Back to Explorer
        </Link>
        <div className="bg-white border border-zinc-200 shadow-sm rounded-none relative z-20 p-5 sm:p-6 rounded-none border border-zinc-200 min-w-0 shadow-lg shadow-sm">
          <div className="flex flex-col gap-5 min-w-0">
            <div className="min-w-0 pr-1">
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wider mb-1">{topic.subject_name}</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight break-words">{topic.name}</h1>
              {topic.teacher_name && (
                <p className="text-sm text-zinc-500 mt-1 flex items-center gap-1 flex-wrap">
                  <FiUser size={12} /> Taught by {topic.teacher_name}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-2.5 items-stretch sm:items-center content-start min-w-0 w-full">
              <div ref={teachMenuRef} className="relative z-[60] shrink-0">
                <button
                  type="button"
                  onClick={() => setShowTeachMenu(!showTeachMenu)}
                  disabled={lectureLoading}
                  className={`${actionBtnClass} bg-blue-600 text-white hover:bg-blue-700 shadow-sm border border-transparent `}
                  aria-expanded={showTeachMenu}
                  aria-haspopup="true"
                >
                  <FiBookOpen size={16} className="shrink-0" />
                  {lectureLoading ? 'Generating…' : 'Teach Me'} (3 ⚡)
                  <FiChevronDown size={14} className={`shrink-0 transition-transform ${showTeachMenu ? 'rotate-180' : ''}`} />
                </button>
                {showTeachMenu && (
                  <div
                    role="menu"
                    className="absolute top-full left-0 mt-2 w-56 max-w-[min(100vw-2rem,16rem)] rounded-none border border-zinc-200 bg-white  py-2 shadow-2xl shadow-sm ring-1 ring-white/10 z-[70] animate-fadeInUp"
                  >
                    <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 border-b border-zinc-200 mb-1">Select Context</p>
                    <button type="button" onClick={() => handleTeachMe('notes')} className="w-full text-left px-4 py-2 text-sm text-zinc-900 hover:bg-zinc-100 flex items-center gap-2 transition-colors">
                      <FiFileText size={14} className="text-indigo-600 shrink-0" /> Notes Only
                    </button>
                    <button type="button" onClick={() => handleTeachMe('youtube')} className="w-full text-left px-4 py-2 text-sm text-zinc-900 hover:bg-zinc-100 flex items-center gap-2 transition-colors">
                      <FiYoutube size={14} className="text-red-600 shrink-0" /> YouTube Lecture Only
                    </button>
                    <button type="button" onClick={() => handleTeachMe('both')} className="w-full text-left px-4 py-2 text-sm text-zinc-900 hover:bg-zinc-100 flex items-center gap-2 transition-colors">
                      <FiLayers size={14} className="text-blue-600 shrink-0" /> Both (Comprehensive)
                    </button>
                  </div>
                )}
              </div>
              <button type="button" onClick={handleFlashcards} className={`${actionBtnClass} bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-200`}>
                <FiLayers size={16} className="shrink-0" />
                Flashcards
              </button>
              <button type="button" onClick={handleExam} className={`${actionBtnClass} bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-200`}>
                <FiAward size={16} className="shrink-0" />
                <span className="hidden sm:inline">Exam (1 ⚡)</span>
                <span className="sm:hidden">Exam</span>
              </button>
              <button type="button" onClick={handleMindMap} className={`${actionBtnClass} bg-purple-500/15 text-purple-400 border-purple-500/30 hover:bg-purple-500/25 hover:border-purple-500/50`}>
                <FiShare2 size={16} className="shrink-0" />
                <span className="hidden sm:inline">Mind Map (2 ⚡)</span>
                <span className="sm:hidden">Mind Map</span>
              </button>
              <button type="button" onClick={handlePodcast} className={`${actionBtnClass} bg-indigo-500/15 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/25 hover:border-indigo-500/50`}>
                <FiHeadphones size={16} className="shrink-0" />
                <span className="hidden md:inline">Audio Overview (3 ⚡)</span>
                <span className="md:hidden">Audio (3 ⚡)</span>
              </button>
              <Link to={`/upload?topicId=${topicId}`} className={`${actionBtnClass} bg-zinc-100 text-zinc-900 border-zinc-200 hover:bg-zinc-100`}>
                <FiFileText size={16} className="shrink-0" />
                <span className="hidden sm:inline">Upload PDF</span>
                <span className="sm:hidden">PDF</span>
              </Link>
              <button type="button" onClick={handleYouTube} className={`${actionBtnClass} bg-red-50 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-200`}>
                <FiYoutube size={16} className="shrink-0" />
                <span className="hidden sm:inline">Link YouTube</span>
                <span className="sm:hidden">YouTube</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showLecture && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-zinc-200 shadow-sm rounded-none flex flex-col h-[600px] max-h-[75vh] min-h-0 border border-blue-200">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between shrink-0 bg-blue-50">
              <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <FiBookOpen className="text-blue-600" /> Generated Lecture
              </h2>
              <button onClick={() => setShowLecture(false)} className="text-zinc-500 hover:text-zinc-900 text-sm">Close</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar min-h-0">
              {lectureLoading ? (
                <LoadingSpinner text="AI is formulating the lecture..." />
              ) : (
                <div
                  className="lecture-content prose prose-gray max-w-none prose-p:text-zinc-500 prose-headings:text-zinc-900"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(lectureContent) }}
                />
              )}
            </div>
          </div>

          <div className="bg-white border border-zinc-200 shadow-lg rounded-none flex flex-col h-[600px] max-h-[75vh] min-h-0 border border-zinc-200 rounded-none overflow-hidden shadow-2xl shadow-sm">
            <div className="px-4 py-3 border-b border-zinc-200 flex items-center gap-3 shrink-0 bg-zinc-50">
              <div className="flex h-9 w-9 items-center justify-center rounded-none bg-blue-50 text-blue-600 border border-blue-200">
                <Bot size={18} strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-900 tracking-tight">Tutor</h2>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium flex items-center gap-1">
                  <Sparkles size={10} className="text-indigo-600" /> AI session
                </p>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar space-y-3 min-h-0 bg-zinc-50">
              {chatHistory.length === 0 && !lectureLoading && (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <div className="h-12 w-12 rounded-none bg-zinc-100 border border-zinc-200 flex items-center justify-center mb-3">
                    <FiMessageSquare className="text-zinc-500 opacity-60" size={22} />
                  </div>
                  <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">
                    Ask anything about the lecture. Replies stream in with a calm, iMessage-style layout.
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
                      className={`max-w-[85%] rounded-none px-3.5 py-2.5 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-md' : 'bg-zinc-100 text-zinc-800 rounded-tl-md text-zinc-900'
                        }`}
                    >
                      {msg.text}
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
                  <div className="max-w-[80%] rounded-none px-4 py-3 bg-zinc-100 text-zinc-800 flex gap-1.5 items-center">
                    <span className="w-2 h-2 rounded-full bg-blue-50 animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 rounded-full bg-blue-50 animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 rounded-full bg-blue-50 animate-bounce [animation-delay:300ms]" />
                  </div>
                </motion.div>
              )}
              <div ref={chatBottomRef} />
            </div>

            <div className="border-t border-zinc-200 shrink-0 bg-zinc-50 ">
              <div className="px-4 py-2 flex items-center gap-2 border-b border-zinc-200">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Context</span>
                <select
                  value={chatContextMode}
                  onChange={(e) => setChatContextMode(e.target.value)}
                  className="flex-1 max-w-[200px] rounded-sm border border-zinc-200 rounded-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white text-zinc-900 text-xs py-1.5 px-2"
                >
                  <option value="both">Both (Comprehensive)</option>
                  <option value="notes">Notes Only</option>
                  <option value="youtube">YouTube Only</option>
                </select>
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-2 p-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Message your tutor…"
                  className="flex-1 border border-zinc-200 rounded-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white text-zinc-900 py-2.5 px-4 rounded-full text-sm"
                  disabled={chatLoading || lectureLoading}
                />
                <motion.button
                  type="submit"
                  disabled={!chatInput.trim() || chatLoading || lectureLoading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-11 h-11 rounded-full bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center disabled:opacity-40 shrink-0 border-0 p-0"
                >
                  <Send size={18} strokeWidth={2} />
                </motion.button>
              </form>
            </div>
          </div>
        </div>
      )}

      {showFlashcards && (
        <Flashcards topicId={topicId} onClose={() => setShowFlashcards(false)} />
      )}

      {showExam && (
        <ExamSimulator topicId={topicId} onClose={() => setShowExam(false)} refreshUser={refreshUser} />
      )}

      {showMindMap && (
        <MindMapViewer topicId={topicId} onClose={() => setShowMindMap(false)} refreshUser={refreshUser} />
      )}

      {showPodcast && (
        <PodcastPlayer topicId={topicId} onClose={() => setShowPodcast(false)} refreshUser={refreshUser} />
      )}

      {showYouTube && (
        <YouTubeIngestor topicId={topicId} onClose={() => setShowYouTube(false)} refreshUser={refreshUser} />
      )}

      {!showLecture && !showFlashcards && !showExam && !showYouTube && !showMindMap && !showPodcast && subtopics.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Subtopics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {subtopics.map((sub) => (
              <Link key={sub.id} to={`/topic/${sub.id}`} className="bg-white border border-zinc-200 shadow-sm rounded-none  hover:border-zinc-300 p-4 transition-all duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-sm bg-indigo-50 flex items-center justify-center">
                    <FiFileText size={14} className="text-indigo-600" />
                  </div>
                  <span className="text-sm font-medium text-zinc-900">{sub.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!showLecture && !showFlashcards && !showExam && !showYouTube && !showMindMap && !showPodcast && (
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Notes ({notes.length})</h2>
          {notes.length === 0 ? (
            <EmptyState
              title="No notes for this topic yet"
              description="Upload a PDF or slide deck — we will extract summaries, key points, and power your AI tutor."
              ctaLabel="Upload your first note"
              to={`/upload?topicId=${topicId}`}
            />
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="bg-white border border-zinc-200 shadow-sm rounded-none overflow-hidden transition-all duration-300">
                  <div className="p-5 cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => setExpandedNote(expandedNote === note.id ? null : note.id)}>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-none bg-background flex items-center justify-center border border-zinc-200 shrink-0 overflow-hidden">
                        {note.file_url ? (
                          <img
                            src={note.file_url.startsWith('http') ? note.file_url : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${note.file_url}`}
                            alt="Note"
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<svg class="w-6 h-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>'; }}
                          />
                        ) : (
                          <FiFileText size={24} className="text-zinc-500" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-zinc-900">Note #{note.id}</span>
                          {note.is_verified && (
                            <span className="px-2 py-0.5 text-[10px] font-medium bg-green-50 text-green-600 rounded-full flex items-center gap-1">
                              <FiCheck size={10} /> Verified
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 flex items-center gap-3">
                          <span className="flex items-center gap-1"><FiUser size={10} /> {note.uploader_name}</span>
                          <span className="flex items-center gap-1"><FiClock size={10} /> {new Date(note.created_at).toLocaleDateString()}</span>
                        </p>
                        {note.summary && <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{note.summary}</p>}
                      </div>

                      <div className="text-center shrink-0">
                        <div className={`text-xl font-bold ${getScoreColor(note.quality_score)}`}>{note.quality_score}</div>
                        <p className="text-[10px] text-zinc-500">Quality</p>
                      </div>

                      <div className="shrink-0">
                        {expandedNote === note.id ? <FiChevronUp className="text-zinc-500" /> : <FiChevronDown className="text-zinc-500" />}
                      </div>
                    </div>
                  </div>

                  {expandedNote === note.id && (
                    <div className="border-t border-zinc-200 p-5 bg-zinc-50 space-y-4">
                      {note.summary && (
                        <div>
                          <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">Summary</h4>
                          <p className="text-sm text-zinc-500 leading-relaxed">{note.summary}</p>
                        </div>
                      )}
                      {note.key_points && note.key_points.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">Key Points</h4>
                          <ul className="space-y-2">
                            {(typeof note.key_points === 'string' ? JSON.parse(note.key_points) : note.key_points).map((point, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-zinc-500">
                                <FiStar size={12} className="text-amber-600 shrink-0 mt-1" />
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {note.file_url && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setViewingNoteUrl(note.file_url)}
                            className="w-full sm:w-auto text-xs font-bold uppercase tracking-wider bg-green-50 text-green-600 hover:bg-green-50 px-4 py-2.5 rounded-none transition-colors flex items-center justify-center gap-2 cursor-pointer border-0 mt-2"
                            title="View full note securely"
                          >
                            <FiExternalLink size={14} /> Open Full Document Viewer
                          </button>
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

      {!showLecture && !showFlashcards && !showExam && !showYouTube && !showMindMap && !showPodcast && relatedTopics.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
            <FiLink size={16} className="text-indigo-600" /> Related Topics
          </h2>
          <div className="flex flex-wrap gap-3">
            {relatedTopics.map((rt) => (
              <Link
                key={rt.id}
                to={`/topic/${rt.id}`}
                className="px-4 py-2 rounded-none bg-indigo-50 border border-indigo-200 text-sm text-zinc-900 hover:border-indigo-200 transition-all flex items-center gap-2"
              >
                <FiLink size={12} className="text-indigo-600" />
                {rt.name}
                <span className="text-[10px] text-zinc-500">({rt.relation_type})</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      <NoteViewerModal url={viewingNoteUrl} onClose={() => setViewingNoteUrl(null)} />
    </div>
  );
};

export default TopicPage;
