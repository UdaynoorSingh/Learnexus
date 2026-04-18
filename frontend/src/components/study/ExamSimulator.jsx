import { useState, useEffect } from 'react';
import { generateExam } from '../../services/aiService';
import LoadingSpinner from '../common/LoadingSpinner';
import { FiAward, FiX, FiCheck, FiXCircle, FiArrowRight, FiRotateCw, FiAlertCircle } from 'react-icons/fi';
import { MOOD_MASCOTS } from '../../constants/mascots';

const ExamSimulator = ({ topicId, onClose, refreshUser }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [finished, setFinished] = useState(false);
  const [creditError, setCreditError] = useState(false);

  useEffect(() => {
    fetchExam();
  }, []);

  const fetchExam = async () => {
    setLoading(true);
    setError(null);
    setCreditError(false);
    setQuestions([]);
    setCurrentQ(0);
    setScore(0);
    setFinished(false);
    setSubmitted(false);
    setSelectedOption(null);
    try {
      const data = await generateExam(topicId);
      setQuestions(data);
    } catch (err) {
      if (err.response?.status === 403) {
        setCreditError(true);
        setError('Not enough credits! Upload more notes to earn credits.');
      } else if (err.response?.status === 404) {
        setError('No notes found for this topic. Upload notes first to take an exam.');
      } else {
        setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to generate exam.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (selectedOption === null) return;
    setSubmitted(true);
    const current = questions[currentQ];
    if (current.correctAnswer === selectedOption) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentQ + 1 >= questions.length) {
      setFinished(true);
      if (refreshUser) refreshUser();
    } else {
      setCurrentQ((prev) => prev + 1);
      setSelectedOption(null);
      setSubmitted(false);
    }
  };

  const getGradeInfo = (s, total) => {
    const pct = (s / total) * 100;
    if (pct >= 80) return { grade: 'A', label: 'Excellent!', color: 'text-success', bg: 'bg-success/20', ring: 'border-success' };
    if (pct >= 60) return { grade: 'B', label: 'Good Job!', color: 'text-primary', bg: 'bg-primary/20', ring: 'border-primary' };
    if (pct >= 40) return { grade: 'C', label: 'Keep Studying', color: 'text-warning', bg: 'bg-warning/20', ring: 'border-warning' };
    return { grade: 'F', label: 'Needs Improvement', color: 'text-danger', bg: 'bg-danger/20', ring: 'border-danger' };
  };

  const currentQuestion = questions[currentQ];

  return (
    <div className="glass-card border border-primary/20 overflow-hidden animate-fadeInUp">
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-primary/5">
        <h2 className="text-lg font-bold text-text flex items-center gap-2">
          <FiAward className="text-primary" /> Exam Simulator
        </h2>
        <div className="flex items-center gap-3">
          {questions.length > 0 && !finished && (
            <span className="text-sm text-text-muted font-medium">
              Question {currentQ + 1} / {questions.length}
            </span>
          )}
          <button onClick={onClose} className="text-text-muted hover:text-text transition-colors">
            <FiX size={18} />
          </button>
        </div>
      </div>

      {questions.length > 0 && !finished && (
        <div className="h-1 bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
            style={{ width: `${((currentQ + (submitted ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>
      )}

      <div className="p-6 min-h-[450px] flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner text="AI is preparing your exam..." />
          </div>
        ) : error ? (
          
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className={`w-16 h-16 rounded-full ${creditError ? 'bg-warning/15' : 'bg-danger/15'} flex items-center justify-center mb-5`}>
              <FiAlertCircle size={32} className={creditError ? 'text-warning' : 'text-danger'} />
            </div>
            <p className={`text-xl font-bold mb-2 ${creditError ? 'text-warning' : 'text-danger'}`}>
              {creditError ? 'Insufficient Credits' : 'Error'}
            </p>
            <p className="text-text-muted mb-6 max-w-md">{error}</p>
            {!creditError && (
              <button onClick={fetchExam} className="btn-gradient text-sm flex items-center gap-2">
                <FiRotateCw size={14} /> Retry
              </button>
            )}
          </div>
        ) : finished ? (
          
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-fadeInUp">
            {(() => {
              const info = getGradeInfo(score, questions.length);
              const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;
              const mood =
                pct >= 75 ? MOOD_MASCOTS.proud : pct < 45 ? MOOD_MASCOTS.wrongAnswer : MOOD_MASCOTS.encouraging;
              return (
                <>
                  <img
                    src={mood.src}
                    alt={mood.alt}
                    className="w-28 h-auto sm:w-32 object-contain drop-shadow-lg mb-4"
                    draggable={false}
                  />
                  <div className={`w-32 h-32 rounded-full ${info.bg} border-4 ${info.ring} flex items-center justify-center mb-6 shadow-lg`}>
                    <span className={`text-5xl font-black ${info.color}`}>{info.grade}</span>
                  </div>
                  <h3 className={`text-2xl font-bold ${info.color} mb-2`}>{info.label}</h3>
                  <p className="text-text-muted text-lg mb-1">
                    You scored <span className="text-text font-bold">{score}</span> out of <span className="text-text font-bold">{questions.length}</span>
                  </p>
                  <p className="text-text-muted text-sm mb-8">
                    {Math.round((score / questions.length) * 100)}% accuracy
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={fetchExam}
                      className="btn-gradient text-sm flex items-center gap-2"
                    >
                      <FiRotateCw size={14} /> Retake Exam (1 ⚡)
                    </button>
                    <button
                      onClick={onClose}
                      className="px-5 py-2.5 rounded-xl bg-white/10 text-text text-sm font-semibold hover:bg-white/20 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        ) : currentQuestion ? (
          
          <div className="flex-1 flex flex-col">
            <div className="mb-6">
              <span className="text-xs text-primary font-semibold uppercase tracking-wider mb-3 block">
                Question {currentQ + 1}
              </span>
              <p className="text-lg text-text font-semibold leading-relaxed">
                {currentQuestion.question}
              </p>
            </div>

            <div className="space-y-3 mb-6 flex-1">
              {currentQuestion.options.map((option, i) => {
                const isSelected = selectedOption === option;
                const isCorrect = submitted && option === currentQuestion.correctAnswer;
                const isWrong = submitted && isSelected && option !== currentQuestion.correctAnswer;

                let optionClasses = 'w-full text-left p-4 rounded-xl border transition-all duration-300 text-sm font-medium ';

                if (submitted) {
                  if (isCorrect) {
                    optionClasses += 'border-success bg-success/15 text-success';
                  } else if (isWrong) {
                    optionClasses += 'border-danger bg-danger/15 text-danger';
                  } else {
                    optionClasses += 'border-black/10 bg-white/60 text-text-muted opacity-50';
                  }
                } else {
                  if (isSelected) {
                    optionClasses += 'border-primary bg-primary/15 text-text ring-1 ring-primary/30';
                  } else {
                    optionClasses += 'border-black/10 bg-white/70 text-text hover:border-primary/40 hover:bg-primary/10 cursor-pointer';
                  }
                }

                return (
                  <button
                    key={i}
                    onClick={() => !submitted && setSelectedOption(option)}
                    disabled={submitted}
                    className={optionClasses}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                        submitted && isCorrect ? 'border-success bg-success text-white' :
                        submitted && isWrong ? 'border-danger bg-danger text-white' :
                        isSelected ? 'border-primary bg-primary text-white' :
                        'border-white/20 text-text-muted'
                      }`}>
                        {submitted && isCorrect ? <FiCheck size={14} /> :
                         submitted && isWrong ? <FiXCircle size={14} /> :
                         String.fromCharCode(65 + i)}
                      </span>
                      <span>{option}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {submitted && currentQuestion.explanation && (
              <div className="mb-6 p-4 rounded-xl bg-accent/10 border border-accent/20 animate-fadeInUp">
                <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">💡 Explanation</p>
                <p className="text-sm text-text-muted leading-relaxed">{currentQuestion.explanation}</p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              {!submitted ? (
                <button
                  onClick={handleSubmit}
                  disabled={selectedOption === null}
                  className="btn-gradient text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Submit Answer
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="btn-gradient text-sm flex items-center gap-2"
                >
                  {currentQ + 1 >= questions.length ? 'See Results' : 'Next Question'}
                  <FiArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ExamSimulator;
