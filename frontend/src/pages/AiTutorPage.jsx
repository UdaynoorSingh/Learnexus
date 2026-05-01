import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Sparkles, BookOpen, Play, Send, Bot,
  ChevronRight, ChevronLeft, Calendar, Clock, Brain,
  CheckCircle2, XCircle, AlertTriangle, BarChart3,
  Loader2, MapPin, Zap, MessageSquare, ArrowLeft,
  CalendarOff, Trophy, Target, Volume2, Pause, Square,
} from 'lucide-react';
import {
  initCourse, prepNextLecture, askDoubt, submitQuiz,
  reportAbsence, getPerformanceReport,
} from '../services/tutorService';
import api from '../services/api';
import PageMascot from '../components/ui/PageMascot';
import AiLoadingState from '../components/common/AiLoadingState';
import ModalShell from '../components/ui/ModalShell';
import Button from '../components/ui/Button';
import Chip from '../components/ui/Chip';

const TUTOR_ROADMAP_MESSAGES = [
  'Analyzing syllabus...',
  'Vectorizing knowledge graph...',
  'Consulting community RAG...',
  'Composing multi-week plan with LangGraph...',
  'Finalizing roadmap...',
];

const TUTOR_LECTURE_MESSAGES = [
  'Fetching best resources...',
  'Drafting lecture script...',
  'Aligning to your learning style...',
  'Consulting community RAG...',
  'Packaging audio and study aids...',
];

const TUTOR_DOUBT_MESSAGES = [
  'Retrieving lecture context...',
  'Reasoning over your question...',
  'Consulting community RAG...',
  'Checking for contradictions...',
  'Formulating a clear answer...',
];

const TUTOR_QUIZ_MESSAGES = [
  'Reading your submissions...',
  'Cross-checking against model answers...',
  'Scoring with the rubric...',
  'Summarizing strengths and gaps...',
  'Almost done...',
];

const TUTOR_PERF_MESSAGES = [
  'Aggregating your progress...',
  'Identifying weak topics...',
  'Consulting performance signals...',
  'Drafting recommendations...',
];

const spring = { type: 'spring', stiffness: 420, damping: 32 };
const fadeIn = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 } };


const AiTutorPage = () => {
  const location = useLocation();
  const initialTopic = location.state?.topic || '';

  const [studentId, setStudentId] = useState(() => sessionStorage.getItem('tutor_student_id') || '');
  const [roadmap, setRoadmap] = useState(() => {
    const saved = sessionStorage.getItem('tutor_roadmap');
    return saved ? JSON.parse(saved) : null;
  });
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [view, setView] = useState(roadmap ? 'roadmap' : 'setup'); 
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(null);

  const [formData, setFormData] = useState({
    topic: initialTopic,
    depth_level: 'intermediate',
    duration_input: '4 weeks',
    pace_speed: 'normal',
    preferred_language: 'English',
    learning_style: 'visual',
    constraints: '',
  });
  const [initLoading, setInitLoading] = useState(false);
  const [initError, setInitError] = useState('');

  const [lectureData, setLectureData] = useState(null);
  const [lectureLoading, setLectureLoading] = useState(false);

  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [ttsPaused, setTtsPaused] = useState(false);
  const [ttsRate, setTtsRate] = useState(1);
  const ttsUtteranceRef = useRef(null);

  const ttsSpeak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = ttsRate;
    utterance.pitch = 1;
    utterance.onend = () => { setTtsPlaying(false); setTtsPaused(false); };
    utterance.onerror = () => { setTtsPlaying(false); setTtsPaused(false); };
    ttsUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setTtsPlaying(true);
    setTtsPaused(false);
  };

  const ttsPause = () => {
    window.speechSynthesis?.pause();
    setTtsPaused(true);
  };

  const ttsResume = () => {
    window.speechSynthesis?.resume();
    setTtsPaused(false);
  };

  const ttsStop = () => {
    window.speechSynthesis?.cancel();
    setTtsPlaying(false);
    setTtsPaused(false);
  };

  useEffect(() => {
    return () => window.speechSynthesis?.cancel();
  }, [selectedDay]);

  const [doubtHistory, setDoubtHistory] = useState([]);
  const [doubtInput, setDoubtInput] = useState('');
  const [doubtLoading, setDoubtLoading] = useState(false);
  const chatEndRef = useRef(null);

  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);

  const [showAbsence, setShowAbsence] = useState(false);
  const [absenceDates, setAbsenceDates] = useState('');
  const [absenceLoading, setAbsenceLoading] = useState(false);

  const [perfReport, setPerfReport] = useState(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [showPerf, setShowPerf] = useState(false);

  useEffect(() => {
    if (studentId) sessionStorage.setItem('tutor_student_id', studentId);
    if (roadmap) sessionStorage.setItem('tutor_roadmap', JSON.stringify(roadmap));
  }, [studentId, roadmap]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (roadmap || studentId) return;
      try {
        const { data } = await api.get('/dashboard/tutor-state', { skipErrorToast: true });
        const s = data?.state;
        if (!s || cancelled) return;
        if (s.studentId) setStudentId(String(s.studentId));
        if (s.roadmap) setRoadmap(s.roadmap);
        if (Array.isArray(s.calendarEvents)) setCalendarEvents(s.calendarEvents);
        if (s.roadmap) setView('roadmap');
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [doubtHistory, doubtLoading]);

  const isSessionLost = (err) => {
    const status = err?.response?.status;
    const detail = err?.response?.data?.detail || '';
    return status === 404 && (typeof detail === 'string' && detail.includes('not found'));
  };

  const handleSessionLost = () => {
    sessionStorage.removeItem('tutor_student_id');
    sessionStorage.removeItem('tutor_roadmap');
    setStudentId('');
    setRoadmap(null);
    setSelectedDay(null);
    setView('setup');
    setInitError('Your session expired (server was restarted). Please create a new course.');
  };

  const handleInitCourse = async (e) => {
    e.preventDefault();
    setInitLoading(true);
    setInitError('');
    try {
      const result = await initCourse({
        ...formData,
        constraints: formData.constraints || null,
      });
      setStudentId(result.student_id);
      setRoadmap(result.roadmap);
      setCalendarEvents(result.calendar_events || []);
      setView('roadmap');

      try {
        await api.put(
          '/dashboard/tutor-state',
          {
            state: {
              studentId: result.student_id,
              roadmap: result.roadmap,
              calendarEvents: result.calendar_events || [],
              createdAt: new Date().toISOString(),
            },
          },
          { skipErrorToast: true }
        );
      } catch {
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || err.message || 'Failed to initialize course.';
      setInitError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setInitLoading(false);
    }
  };

  const handlePrepLecture = async () => {
    setLectureLoading(true);
    setLectureData(null);
    try {
      const data = await prepNextLecture(studentId);
      setLectureData(data);
      setDoubtHistory([{
        role: 'ai',
        text: `I've prepared your lecture on "${data.title}". Feel free to ask me anything about the topics covered!`,
      }]);
    } catch (err) {
      console.error(err);
      if (isSessionLost(err)) { handleSessionLost(); return; }
      setLectureData({ error: err.response?.data?.detail || err.message });
    } finally {
      setLectureLoading(false);
    }
  };

  const handleAskDoubt = async (e) => {
    e.preventDefault();
    if (!doubtInput.trim() || doubtLoading) return;
    const question = doubtInput.trim();
    setDoubtHistory(prev => [...prev, { role: 'user', text: question }]);
    setDoubtInput('');
    setDoubtLoading(true);
    try {
      const idx = selectedDay?.lecture_index ?? 0;
      const result = await askDoubt(studentId, question, idx);
      setDoubtHistory(prev => [...prev, { role: 'ai', text: result.answer }]);
    } catch (err) {
      if (isSessionLost(err)) { handleSessionLost(); return; }
      setDoubtHistory(prev => [...prev, { role: 'ai', text: 'Sorry, I couldn\'t process your question. Please try again.' }]);
    } finally {
      setDoubtLoading(false);
    }
  };

  const handleSubmitQuiz = async () => {
    setQuizLoading(true);
    setQuizResult(null);
    try {
      const answers = Object.entries(quizAnswers).map(([qid, opt]) => ({
        question_id: qid, selected_option: opt,
      }));
      const quizId = `quiz_${selectedDay?.title?.replace(/\s+/g, '_') || 'unknown'}`;
      const result = await submitQuiz(studentId, quizId, answers);
      setQuizResult(result);
    } catch (err) {
      console.error(err);
      if (isSessionLost(err)) { handleSessionLost(); return; }
      setQuizResult({ error: err.response?.data?.detail || err.message });
    } finally {
      setQuizLoading(false);
    }
  };

  const handleReportAbsence = async () => {
    if (!absenceDates.trim()) return;
    setAbsenceLoading(true);
    try {
      const dates = absenceDates.split(',').map(d => d.trim()).filter(Boolean);
      const result = await reportAbsence(studentId, dates);
      if (result.updated_roadmap) setRoadmap(result.updated_roadmap);
      setShowAbsence(false);
      setAbsenceDates('');
    } catch (err) {
      console.error(err);
      if (isSessionLost(err)) { handleSessionLost(); return; }
    } finally {
      setAbsenceLoading(false);
    }
  };

  const handlePerformanceReport = async () => {
    setPerfLoading(true);
    setPerfReport(null);
    setShowPerf(true);
    try {
      const report = await getPerformanceReport(studentId);
      setPerfReport(report);
    } catch (err) {
      console.error(err);
      if (isSessionLost(err)) { handleSessionLost(); return; }
      setPerfReport({ error: err.message });
    } finally {
      setPerfLoading(false);
    }
  };

  const openDay = (day, weekIdx) => {
    setSelectedDay(day);
    setSelectedWeekIdx(weekIdx);
    setLectureData(null);
    setDoubtHistory([]);
    setQuizAnswers({});
    setQuizResult(null);
    setView('day');
  };

  const newSession = () => {
    sessionStorage.removeItem('tutor_student_id');
    sessionStorage.removeItem('tutor_roadmap');
    setStudentId('');
    setRoadmap(null);
    setView('setup');
    setSelectedDay(null);
    setFormData(fd => ({ ...fd, topic: '' }));
  };


  if (view === 'setup') {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fadeInUp">
        {initLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-violet-200/70 bg-white/95 p-8 shadow-2xl shadow-violet-500/15 ring-1 ring-white/80">
              <AiLoadingState
                isLoading={initLoading}
                messages={TUTOR_ROADMAP_MESSAGES}
                label="Generating course roadmap"
              />
            </div>
          </div>
        )}
        {/* Hero */}
        <div className="glass-card p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-ai">
                  <GraduationCap size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-text flex items-center gap-2">
                    AI Tutor <Sparkles className="text-accent" size={22} />
                  </h1>
                  <p className="text-xs text-text-muted uppercase tracking-widest font-medium">Personalized Learning Agent</p>
                </div>
              </div>
              <p className="text-text-muted max-w-2xl leading-relaxed mt-4">
                Tell me what you want to learn. I'll generate a complete course roadmap, deliver just-in-time lectures with audio,
                handle your doubts, administer quizzes, and adapt the schedule based on your performance.
              </p>
            </div>
            
            <PageMascot role="aiTutor" size="xl" className="drop-shadow-2xl shrink-0" />
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleInitCourse} className="glass-card p-8 space-y-6">
          <h2 className="text-xl font-bold text-text flex items-center gap-2">
            <Target size={20} className="text-primary" /> Course Configuration
          </h2>

          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">What do you want to learn? *</label>
            <input
              type="text"
              value={formData.topic}
              onChange={e => setFormData(fd => ({ ...fd, topic: e.target.value }))}
              placeholder="e.g. Machine Learning, Organic Chemistry, Data Structures..."
              className="w-full input-glass py-3 px-4 rounded-xl text-[15px]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Depth */}
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">Depth Level</label>
              <select
                value={formData.depth_level}
                onChange={e => setFormData(fd => ({ ...fd, depth_level: e.target.value }))}
                className="w-full input-glass py-3 px-4 rounded-xl text-sm"
              >
                <option value="beginner">🌱 Beginner</option>
                <option value="intermediate">📘 Intermediate</option>
                <option value="advanced">🚀 Advanced</option>
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">Duration</label>
              <input
                type="text"
                value={formData.duration_input}
                onChange={e => setFormData(fd => ({ ...fd, duration_input: e.target.value }))}
                placeholder="e.g. 4 weeks, 2 months"
                className="w-full input-glass py-3 px-4 rounded-xl text-sm"
              />
            </div>

            {/* Pace */}
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">Learning Pace</label>
              <select
                value={formData.pace_speed}
                onChange={e => setFormData(fd => ({ ...fd, pace_speed: e.target.value }))}
                className="w-full input-glass py-3 px-4 rounded-xl text-sm"
              >
                <option value="slow">🐢 Slow & Thorough</option>
                <option value="normal">⚡ Normal</option>
                <option value="fast">🚀 Fast-paced</option>
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">Language</label>
              <input
                type="text"
                value={formData.preferred_language}
                onChange={e => setFormData(fd => ({ ...fd, preferred_language: e.target.value }))}
                className="w-full input-glass py-3 px-4 rounded-xl text-sm"
              />
            </div>

            {/* Style */}
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">Learning Style</label>
              <select
                value={formData.learning_style}
                onChange={e => setFormData(fd => ({ ...fd, learning_style: e.target.value }))}
                className="w-full input-glass py-3 px-4 rounded-xl text-sm"
              >
                <option value="visual">👁️ Visual</option>
                <option value="auditory">🎧 Auditory</option>
                <option value="reading">📖 Reading/Writing</option>
                <option value="kinesthetic">🤲 Kinesthetic</option>
              </select>
            </div>
          </div>

          {/* Constraints */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Constraints (optional)</label>
            <textarea
              value={formData.constraints}
              onChange={e => setFormData(fd => ({ ...fd, constraints: e.target.value }))}
              placeholder="e.g. No weekends, skip holidays, focus more on practical examples..."
              className="w-full input-glass py-3 px-4 rounded-xl text-sm min-h-[80px] resize-y"
            />
          </div>

          {initError && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-danger/10 border border-danger/20">
              <AlertTriangle size={18} className="text-danger shrink-0 mt-0.5" />
              <p className="text-sm text-danger">{initError}</p>
            </div>
          )}

          <motion.button
            type="submit"
            disabled={initLoading || !formData.topic.trim()}
            whileHover={{ scale: 1 }}
            whileTap={{ scale: 1 }}
            transition={spring}
            className="w-full btn-gradient py-4 rounded-xl text-base font-semibold flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {initLoading ? (
              <>
                <Sparkles size={20} className="opacity-90" />
                Hang tight — this can take 30–60 seconds
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Generate My Course Roadmap
              </>
            )}
          </motion.button>
        </form>
      </div>
    );
  }

  if (view === 'roadmap' && roadmap) {
    const totalLectures = roadmap.weeks?.reduce(
      (acc, w) => acc + w.days.filter(d => d.type === 'lecture').length, 0
    ) || 0;
    const totalQuizzes = roadmap.weeks?.reduce(
      (acc, w) => acc + w.days.filter(d => d.type === 'quiz').length, 0
    ) || 0;

    return (
      <div className="max-w-7xl mx-auto space-y-6 animate-fadeInUp">
        {/* Header */}
        <div className="glass-card p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-primary/8 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-text">{roadmap.course_title}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-text-muted">
                <span className="flex items-center gap-1.5"><Calendar size={14} /> {roadmap.total_weeks} weeks</span>
                <span className="flex items-center gap-1.5"><BookOpen size={14} /> {totalLectures} lectures</span>
                <span className="flex items-center gap-1.5"><Brain size={14} /> {totalQuizzes} quizzes</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1 }}
                whileTap={{ scale: 1 }}
                transition={spring}
                onClick={() => setShowAbsence(true)}
                className="btn-secondary-outline py-2 px-4 rounded-xl text-sm flex items-center gap-2"
              >
                <CalendarOff size={16} /> Report Absence
              </motion.button>
              <motion.button
                whileHover={{ scale: 1 }}
                whileTap={{ scale: 1 }}
                transition={spring}
                onClick={handlePerformanceReport}
                className="btn-secondary-outline py-2 px-4 rounded-xl text-sm flex items-center gap-2"
              >
                <BarChart3 size={16} /> Performance
              </motion.button>
              <motion.button
                whileHover={{ scale: 1 }}
                whileTap={{ scale: 1 }}
                transition={spring}
                onClick={newSession}
                className="btn-secondary-outline py-2 px-4 rounded-xl text-sm flex items-center gap-2 text-danger border-danger/20 hover:bg-danger/10"
              >
                New Course
              </motion.button>
            </div>
          </div>
        </div>

        <ModalShell
          open={showAbsence}
          onClose={() => setShowAbsence(false)}
          title="Report absence"
          subtitle="Reschedule your roadmap"
          icon={<CalendarOff size={18} className="text-warning" />}
          maxWidth="max-w-md"
          footer={
            <>
              <Button variant="soft" type="button" onClick={() => setShowAbsence(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleReportAbsence}
                disabled={absenceLoading || !absenceDates.trim()}
              >
                {absenceLoading ? <Loader2 className="animate-spin" size={16} /> : null}
                Reschedule
              </Button>
            </>
          }
        >
          <p className="text-sm text-text-muted">
            Enter missed dates (comma-separated, YYYY-MM-DD format):
          </p>
          <input
            type="text"
            value={absenceDates}
            onChange={e => setAbsenceDates(e.target.value)}
            placeholder="2026-04-14, 2026-04-16"
            className="w-full rounded-xl ln-field py-3 px-4 text-sm"
          />
        </ModalShell>

        <ModalShell
          open={showPerf}
          onClose={() => setShowPerf(false)}
          title="Performance report"
          subtitle="Strengths, gaps, and recommendations"
          icon={<BarChart3 size={18} className="text-primary" />}
          maxWidth="max-w-lg"
          footer={
            <Button variant="soft" type="button" onClick={() => setShowPerf(false)} className="w-full sm:w-auto">
              Close
            </Button>
          }
        >
          {perfLoading ? (
            <div className="flex min-h-[12rem] items-center justify-center py-6">
              <AiLoadingState isLoading messages={TUTOR_PERF_MESSAGES} label="Loading performance report" />
            </div>
          ) : perfReport?.error ? (
            <p className="text-sm text-danger">{perfReport.error}</p>
          ) : perfReport ? (
            <div className="space-y-4">
              {perfReport.overall_progress_percent != null && (
                <div className="ln-card p-4">
                  <p className="text-sm text-text-muted mb-2">Overall Progress</p>
                  <div className="w-full h-3 bg-white/60 rounded-full overflow-hidden border border-black/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(perfReport.overall_progress_percent, 100)}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                    />
                  </div>
                  <p className="text-right text-xs text-text-muted mt-1">
                    {perfReport.overall_progress_percent?.toFixed(1)}%
                  </p>
                </div>
              )}
              {perfReport.weak_topics?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-text mb-2">Weak Topics</p>
                  <div className="flex flex-wrap gap-2">
                    {perfReport.weak_topics.map((t, i) => (
                      <Chip key={i} variant="warning">
                        {t}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
              {perfReport.strong_topics?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-text mb-2">Strong Topics</p>
                  <div className="flex flex-wrap gap-2">
                    {perfReport.strong_topics.map((t, i) => (
                      <Chip key={i} variant="success">
                        {t}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
              {perfReport.recommendations && (
                <div className="ln-card p-4">
                  <p className="text-sm font-semibold text-text mb-2">Recommendations</p>
                  <p className="text-sm text-text-muted whitespace-pre-wrap">
                    {typeof perfReport.recommendations === 'string'
                      ? perfReport.recommendations
                      : JSON.stringify(perfReport.recommendations, null, 2)}
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </ModalShell>

        <div className="space-y-6">
          {roadmap.weeks?.map((week, wIdx) => (
            <motion.div
              key={wIdx}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: wIdx * 0.06 }}
              className="glass-card p-5"
            >
              <h3 className="text-base font-bold text-text mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/15 flex items-center justify-center text-xs font-bold text-primary">
                  W{week.week_number}
                </span>
                Week {week.week_number}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {week.days.map((day, dIdx) => {
                  const isLecture = day.type === 'lecture';
                  return (
                    <motion.button
                      key={dIdx}
                      type="button"
                      whileHover={{ scale: 1, y: 0 }}
                      whileTap={{ scale: 1 }}
                      transition={spring}
                      onClick={() => openDay(day, wIdx)}
                      className={`text-left p-4 rounded-xl border transition-all duration-200 ${isLecture
                        ? 'bg-primary/5 border-primary/15 hover:border-primary/40'
                        : 'bg-accent/5 border-accent/15 hover:border-accent/40'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isLecture ? 'text-primary' : 'text-accent'
                          }`}>
                          {isLecture ? '📘 Lecture' : '📝 Quiz'}
                        </span>
                        <span className="text-[10px] text-text-muted">{day.date}</span>
                      </div>
                      <p className="text-sm font-semibold text-text leading-snug mb-2 line-clamp-2">{day.title}</p>
                      {day.topics?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-auto">
                          {day.topics.slice(0, 3).map((t, tIdx) => (
                            <span key={tIdx} className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/8 text-text-muted truncate max-w-[120px]">
                              {t}
                            </span>
                          ))}
                          {day.topics.length > 3 && (
                            <span className="text-[10px] text-text-muted">+{day.topics.length - 3}</span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-3 text-[11px] text-text-muted">
                        <Clock size={11} /> {day.estimated_duration_minutes || 45} min
                        <ChevronRight size={12} className="ml-auto" />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (view === 'day' && selectedDay) {
    const isLecture = selectedDay.type === 'lecture';

    return (
      <div className="max-w-7xl mx-auto space-y-6 animate-fadeInUp">
        <button
          onClick={() => { setView('roadmap'); setSelectedDay(null); }}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft size={16} /> Back to Roadmap
        </button>

        <div className={`glass-card p-6 relative overflow-hidden border ${isLecture ? 'border-primary/20' : 'border-accent/20'
          }`}>
          <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none ${isLecture ? 'bg-primary/10' : 'bg-accent/10'
            }`} />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${isLecture
                ? 'bg-primary/15 text-primary border border-primary/25'
                : 'bg-accent/15 text-accent border border-accent/25'
                }`}>
                {isLecture ? 'Lecture' : 'Quiz'}
              </span>
              <span className="text-text-muted text-sm">{selectedDay.date} · {selectedDay.day}</span>
            </div>
            <h2 className="text-2xl font-bold text-text">{selectedDay.title}</h2>
            {selectedDay.topics?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedDay.topics.map((t, i) => (
                  <span key={i} className="text-xs px-3 py-1.5 rounded-lg bg-white/70 border border-black/10 text-text-muted">{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {isLecture ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              {!lectureData && !lectureLoading && (
                <div className="glass-card p-8 flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <Play size={28} className="text-primary ml-1" />
                  </div>
                  <h3 className="text-lg font-bold text-text">Ready to Learn?</h3>
                  <p className="text-sm text-text-muted max-w-md">
                    Click the button below to prepare this lecture. The AI will fetch the best resources,
                    write an engaging script, and generate audio for you.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1 }}
                    whileTap={{ scale: 1 }}
                    transition={spring}
                    onClick={handlePrepLecture}
                    className="btn-gradient py-3 px-8 rounded-xl text-sm font-semibold flex items-center gap-2"
                  >
                    <Zap size={18} /> Prepare Lecture
                  </motion.button>
                </div>
              )}

              {lectureLoading && (
                <div className="glass-card flex flex-col items-center p-10">
                  <AiLoadingState
                    isLoading={lectureLoading}
                    messages={TUTOR_LECTURE_MESSAGES}
                    label="Preparing lecture"
                  />
                  <p className="mt-2 text-center text-xs text-text-muted">This may take 30–60 seconds.</p>
                </div>
              )}

              {lectureData && !lectureData.error && (
                <div className="space-y-4">
                  {lectureData.script && (
                    <div className="glass-card p-4 border border-primary/15">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                          <Volume2 size={20} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-text-muted mb-1">Browser Text-to-Speech</p>
                          <p className="text-[10px] text-text-muted">Uses your browser's built-in speech engine — completely free</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                        {!ttsPlaying ? (
                          <motion.button
                            whileHover={{ scale: 1 }}
                            whileTap={{ scale: 1 }}
                            onClick={() => ttsSpeak(lectureData.script)}
                            className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg shadow-primary/25"
                          >
                            <Play size={18} className="ml-0.5" />
                          </motion.button>
                        ) : ttsPaused ? (
                          <motion.button
                            whileHover={{ scale: 1 }}
                            whileTap={{ scale: 1 }}
                            onClick={ttsResume}
                            className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg shadow-primary/25"
                          >
                            <Play size={18} className="ml-0.5" />
                          </motion.button>
                        ) : (
                          <motion.button
                            whileHover={{ scale: 1 }}
                            whileTap={{ scale: 1 }}
                            onClick={ttsPause}
                            className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-text"
                          >
                            <Pause size={18} />
                          </motion.button>
                        )}

                        <motion.button
                          whileHover={{ scale: 1 }}
                          whileTap={{ scale: 1 }}
                          onClick={ttsStop}
                          disabled={!ttsPlaying}
                          className="w-10 h-10 rounded-full bg-white/70 border border-black/10 flex items-center justify-center text-text-muted disabled:opacity-30"
                        >
                          <Square size={16} />
                        </motion.button>

                        <div className="flex items-center gap-2 ml-auto">
                          <span className="text-[10px] text-text-muted uppercase tracking-wider">Speed</span>
                          {[0.75, 1, 1.25, 1.5, 2].map(rate => (
                            <button
                              key={rate}
                              onClick={() => {
                                setTtsRate(rate);
                                if (ttsPlaying && lectureData.script) {
                                  ttsStop();
                                  setTimeout(() => {
                                    const u = new SpeechSynthesisUtterance(lectureData.script);
                                    u.rate = rate;
                                    u.onend = () => { setTtsPlaying(false); setTtsPaused(false); };
                                    ttsUtteranceRef.current = u;
                                    window.speechSynthesis.speak(u);
                                    setTtsPlaying(true);
                                  }, 50);
                                }
                              }}
                              className={`text-[11px] px-2 py-1 rounded-md font-medium transition-all ${ttsRate === rate
                                ? 'bg-primary/20 text-primary border border-primary/30'
                                : 'bg-white/5 text-text-muted border border-white/8 hover:bg-white/10'
                                }`}
                            >
                              {rate}x
                            </button>
                          ))}
                        </div>
                      </div>
                      {ttsPlaying && (
                        <div className="mt-3 flex items-center gap-2">
                          <div className="flex gap-1 items-end h-4">
                            {[1, 2, 3, 4, 5].map(i => (
                              <motion.div
                                key={i}
                                animate={{ height: [4, 16, 4] }}
                                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                                className="w-1 bg-primary/60 rounded-full"
                              />
                            ))}
                          </div>
                          <span className="text-[10px] text-primary font-medium">
                            {ttsPaused ? 'Paused' : 'Speaking...'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="glass-card flex flex-col max-h-[600px]">
                    <div className="p-4 border-b border-black/10 flex items-center gap-2 shrink-0">
                      <BookOpen size={18} className="text-primary" />
                      <h3 className="font-bold text-text text-sm">Lecture Script</h3>
                    </div>
                    <div className="p-6 overflow-y-auto flex-1 min-h-0">
                      <div className="lecture-content prose max-w-none text-sm leading-relaxed whitespace-pre-wrap text-text-muted">
                        {lectureData.script}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {lectureData?.error && (
                <div className="glass-card p-6 flex items-start gap-3 border border-danger/20">
                  <XCircle size={20} className="text-danger shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-danger">Failed to prepare lecture</p>
                    <p className="text-xs text-text-muted mt-1">{lectureData.error}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-5">
              <div className="glass-float flex flex-col h-[calc(100vh-12rem)] max-h-[700px] border border-black/10 rounded-2xl overflow-hidden sticky top-24 shadow-xl shadow-black/10">
                <div className="px-4 py-3 border-b border-black/10 flex items-center gap-3 shrink-0 bg-white/70">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/25">
                    <Bot size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text">Doubt Assistant</h3>
                    <p className="text-[10px] text-text-muted uppercase tracking-widest font-medium flex items-center gap-1">
                      <Sparkles size={10} className="text-accent" /> Live session
                    </p>
                  </div>
                </div>

                <div className="p-4 overflow-y-auto flex-1 space-y-3 min-h-0 bg-white/40">
                  {doubtHistory.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                      <div className="h-12 w-12 rounded-2xl bg-white/80 border border-black/10 flex items-center justify-center mb-3">
                        <MessageSquare size={22} className="text-text-muted opacity-60" />
                      </div>
                      <p className="text-sm text-text-muted max-w-xs leading-relaxed">
                        {lectureData ? 'Ask any question about this lecture.' : 'Prepare the lecture first to enable the doubt assistant.'}
                      </p>
                    </div>
                  )}
                  <AnimatePresence initial={false}>
                    {doubtHistory.map((msg, i) => (
                      <motion.div
                        key={i}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={spring}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${msg.role === 'user'
                          ? 'chat-bubble-user rounded-tr-md'
                          : 'chat-bubble-ai rounded-tl-md text-text'
                          }`}>
                          {msg.text}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {doubtLoading && (
                    <div className="flex justify-start">
                      <div className="chat-bubble-ai max-w-[90%] rounded-2xl rounded-tl-md px-3 py-2.5">
                        <AiLoadingState
                          isLoading={doubtLoading}
                          size="sm"
                          messages={TUTOR_DOUBT_MESSAGES}
                          label="Doubt assistant is thinking"
                        />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="border-t border-black/10 shrink-0 bg-white/70 backdrop-blur-md p-3">
                  <form onSubmit={handleAskDoubt} className="flex gap-2">
                    <input
                      type="text"
                      value={doubtInput}
                      onChange={e => setDoubtInput(e.target.value)}
                      placeholder={lectureData ? 'Ask a doubt...' : 'Prepare your lecture first'}
                      className="flex-1 input-premium py-2.5 px-4 rounded-full text-sm"
                      disabled={!lectureData || doubtLoading}
                    />
                    <motion.button
                      type="submit"
                      disabled={!doubtInput.trim() || doubtLoading || !lectureData}
                      whileHover={{ scale: 1 }}
                      whileTap={{ scale: 1 }}
                      className="w-11 h-11 rounded-full btn-ai-primary flex items-center justify-center disabled:opacity-40 shrink-0 border-0 p-0"
                    >
                      <Send size={18} />
                    </motion.button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            {!quizResult ? (
              <>
                <div className="glass-card relative space-y-5 p-6">
                  {quizLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm ring-1 ring-violet-200/50">
                      <AiLoadingState
                        isLoading={quizLoading}
                        messages={TUTOR_QUIZ_MESSAGES}
                        label="Grading quiz"
                      />
                    </div>
                  )}
                  <div className={quizLoading ? 'pointer-events-none select-none opacity-25' : ''}>
                  <h3 className="text-lg font-bold text-text flex items-center gap-2">
                    <Brain size={20} className="text-accent" /> Quiz Submission
                  </h3>
                  <p className="text-sm text-text-muted">
                    This quiz covers lectures: {selectedDay.covers_lectures?.join(', ') || 'N/A'}.
                    Submit your answers below. The AI will grade them and inject revision lectures if needed.
                  </p>

                  {Array.from({ length: selectedDay.num_questions || 5 }).map((_, qIdx) => {
                    const qid = `q${qIdx}`;
                    return (
                      <div key={qid} className="p-4 rounded-xl bg-white/3 border border-white/8 space-y-3">
                        <p className="text-sm font-medium text-text">Question {qIdx + 1}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {['A', 'B', 'C', 'D'].map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setQuizAnswers(prev => ({ ...prev, [qid]: opt }))}
                              className={`py-2.5 px-4 rounded-lg text-sm font-medium transition-all border ${quizAnswers[qid] === opt
                                ? 'bg-accent/20 border-accent/40 text-accent'
                                : 'bg-white/3 border-white/8 text-text-muted hover:bg-white/6 hover:border-white/15'
                                }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  <motion.button
                    whileHover={{ scale: 1 }}
                    whileTap={{ scale: 1 }}
                    transition={spring}
                    onClick={handleSubmitQuiz}
                    disabled={quizLoading || Object.keys(quizAnswers).length === 0}
                    className="w-full btn-gradient py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 size={18} />
                    {quizLoading ? 'Grading…' : 'Submit Quiz'}
                  </motion.button>
                  </div>
                </div>
              </>
            ) : quizResult.error ? (
              <div className="glass-card p-6 flex items-start gap-3 border border-danger/20">
                <XCircle size={20} className="text-danger shrink-0 mt-0.5" />
                <p className="text-sm text-danger">{quizResult.error}</p>
              </div>
            ) : (
              <div className="glass-card p-6 space-y-5">
                <div className="text-center">
                  <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${quizResult.percentage >= 60
                    ? 'bg-success/15 border-2 border-success/30'
                    : 'bg-danger/15 border-2 border-danger/30'
                    }`}>
                    {quizResult.percentage >= 60
                      ? <Trophy size={32} className="text-success" />
                      : <AlertTriangle size={32} className="text-danger" />}
                  </div>
                  <h3 className="text-2xl font-bold text-text">{quizResult.score}/{quizResult.total}</h3>
                  <p className={`text-lg font-semibold ${quizResult.percentage >= 60 ? 'text-success' : 'text-danger'}`}>
                    {quizResult.percentage?.toFixed(0)}%
                  </p>
                </div>

                {quizResult.revision_lecture_injected && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/10 border border-warning/20">
                    <AlertTriangle size={18} className="text-warning shrink-0 mt-0.5" />
                    <p className="text-sm text-warning">Revision lectures have been injected into your roadmap for the weak topics.</p>
                  </div>
                )}

                {quizResult.weak_topics?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-text-muted mb-2">Weak Topics:</p>
                    <div className="flex flex-wrap gap-2">
                      {quizResult.weak_topics.map((t, i) => (
                        <span key={i} className="text-xs px-3 py-1.5 rounded-lg bg-warning/10 border border-warning/20 text-warning">{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => { setView('roadmap'); setSelectedDay(null); setQuizResult(null); }}
                  className="w-full btn-secondary-outline py-3 rounded-xl text-sm flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={16} /> Back to Roadmap
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default AiTutorPage;
