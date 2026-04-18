import { useState, useEffect, useRef, useCallback } from 'react';
import { generatePodcast } from '../../services/aiService';
import { showToast } from '../../services/toast';
import LoadingSpinner from '../common/LoadingSpinner';
import { FiX, FiRotateCw, FiPlay, FiPause, FiSquare, FiSkipForward, FiSkipBack, FiHeadphones, FiVolume2 } from 'react-icons/fi';

const pickVoices = () => {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return { voiceA: null, voiceB: null };

  const enVoices = voices.filter((v) => v.lang.startsWith('en'));
  const pool = enVoices.length >= 2 ? enVoices : voices;

  const female = pool.find((v) => /female|woman|zira|samantha|karen|victoria|fiona/i.test(v.name));
  const male = pool.find((v) => /male|man|david|james|daniel|george|mark|alex/i.test(v.name) && v !== female);

  const voiceA = male || pool[0];
  const voiceB = female || pool[Math.min(1, pool.length - 1)];

  return { voiceA, voiceB };
};

const SPEAKER_CONFIG = {
  'Host A': {
    label: 'Alex',
    subtitle: 'The Curious Student',
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, #6366f1, #818cf8)',
    avatar: '🎓',
    pitch: 1.0,
    rate: 1.02,
  },
  'Host B': {
    label: 'Dr. Nova',
    subtitle: 'The Expert Professor',
    color: '#a855f7',
    gradient: 'linear-gradient(135deg, #a855f7, #c084fc)',
    avatar: '🧠',
    pitch: 0.85,
    rate: 0.96,
  },
};

const PodcastPlayer = ({ topicId, onClose, refreshUser }) => {
  const [script, setScript] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [voicesReady, setVoicesReady] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [progress, setProgress] = useState(0);

  const playingRef = useRef(false);
  const pausedRef = useRef(false);
  const currentIndexRef = useRef(-1);
  const transcriptRef = useRef(null);
  const scriptRef = useRef([]);
  const keepAliveRef = useRef(null);
  const nextLineTimerRef = useRef(null);

  useEffect(() => {
    const synth = window.speechSynthesis;

    const handleVoicesReady = () => {
      const voices = synth.getVoices();
      if (voices.length > 0) {
        setVoicesReady(true);
      }
    };

    handleVoicesReady();
    synth.onvoiceschanged = handleVoicesReady;

    return () => {
      synth.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      playingRef.current = false;
      pausedRef.current = false;
      clearInterval(keepAliveRef.current);
      clearTimeout(nextLineTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (currentLineIndex >= 0 && transcriptRef.current) {
      const activeEl = transcriptRef.current.querySelector(`[data-line-index="${currentLineIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentLineIndex]);

  const fetchScript = useCallback(async () => {
    setLoading(true);
    setError(null);
    setScript([]);
    setCurrentLineIndex(-1);
    setProgress(0);
    setIsPlaying(false);
    setIsPaused(false);
    window.speechSynthesis.cancel();
    playingRef.current = false;
    pausedRef.current = false;
    clearInterval(keepAliveRef.current);
    clearTimeout(nextLineTimerRef.current);

    try {
      const data = await generatePodcast(topicId);
      setScript(data);
      scriptRef.current = data;
      if (refreshUser) refreshUser();
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || err.response?.data?.detail || '';

      if (status === 403) {
        setError('Not enough credits to generate an audio overview. Upload more notes to earn credits.');
      } else if (status === 429 || status === 500) {
        setError('AI is cooling down. Please wait 30 seconds and try again.');
      } else if (status === 404) {
        setError(msg || 'No notes found for this topic. Upload notes first.');
      } else if (!err.isRateLimit) {
        setError(msg || 'Failed to generate audio overview. Please try again.');
      } else {
        setError('AI is cooling down. Please wait 30 seconds and try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    fetchScript();
  }, [fetchScript]);

  const startKeepAlive = useCallback(() => {
    clearInterval(keepAliveRef.current);
    keepAliveRef.current = setInterval(() => {
      const synth = window.speechSynthesis;
      if (synth.speaking && !synth.paused) {
        synth.pause();
        synth.resume();
      }
    }, 10000);
  }, []);

  const stopKeepAlive = useCallback(() => {
    clearInterval(keepAliveRef.current);
  }, []);

  const speakLine = useCallback((index) => {
    clearTimeout(nextLineTimerRef.current);
    const lines = scriptRef.current;

    if (index >= lines.length || !playingRef.current) {
      playingRef.current = false;
      pausedRef.current = false;
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentLineIndex(-1);
      setProgress(100);
      stopKeepAlive();
      return;
    }

    const line = lines[index];
    const config = SPEAKER_CONFIG[line.speaker] || SPEAKER_CONFIG['Host A'];
    const { voiceA, voiceB } = pickVoices();

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(line.text);
    utterance.voice = line.speaker === 'Host A' ? voiceA : voiceB;
    utterance.pitch = config.pitch;
    utterance.rate = config.rate;
    utterance.volume = 1;

    currentIndexRef.current = index;
    setCurrentLineIndex(index);
    setProgress(Math.round(((index + 1) / lines.length) * 100));

    utterance.onend = () => {
      if (playingRef.current && !pausedRef.current) {
        nextLineTimerRef.current = setTimeout(() => {
          speakLine(index + 1);
        }, 250);
      }
    };

    utterance.onerror = (e) => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.error('Speech error:', e.error, e);
      }
    };

    setTimeout(() => {
      if (playingRef.current) {
        window.speechSynthesis.speak(utterance);
        startKeepAlive();
      }
    }, 100);
  }, [startKeepAlive, stopKeepAlive]);

  const handlePlay = () => {
    if (!voicesReady) {
      showToast('error', 'Browser voices are still loading. Please wait a moment and try again.', '🔊 Voices');
      return;
    }

    if (isPlaying && !isPaused) {
      window.speechSynthesis.pause();
      pausedRef.current = true;
      setIsPaused(true);
      stopKeepAlive();
    } else if (isPaused) {
      window.speechSynthesis.resume();
      pausedRef.current = false;
      setIsPaused(false);
      startKeepAlive();
    } else {
      playingRef.current = true;
      pausedRef.current = false;
      setIsPlaying(true);
      setIsPaused(false);
      const startIndex = currentLineIndex >= 0 && currentLineIndex < script.length - 1
        ? currentLineIndex
        : 0;
      speakLine(startIndex);
    }
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    clearTimeout(nextLineTimerRef.current);
    playingRef.current = false;
    pausedRef.current = false;
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentLineIndex(-1);
    setProgress(0);
    stopKeepAlive();
  };

  const handleSkipForward = () => {
    if (currentIndexRef.current < scriptRef.current.length - 1) {
      clearTimeout(nextLineTimerRef.current);
      window.speechSynthesis.cancel();
      playingRef.current = true;
      pausedRef.current = false;
      setIsPlaying(true);
      setIsPaused(false);
      speakLine(currentIndexRef.current + 1);
    }
  };

  const handleSkipBack = () => {
    if (currentIndexRef.current > 0) {
      clearTimeout(nextLineTimerRef.current);
      window.speechSynthesis.cancel();
      playingRef.current = true;
      pausedRef.current = false;
      setIsPlaying(true);
      setIsPaused(false);
      speakLine(currentIndexRef.current - 1);
    }
  };

  const handleLineClick = (index) => {
    clearTimeout(nextLineTimerRef.current);
    window.speechSynthesis.cancel();
    playingRef.current = true;
    pausedRef.current = false;
    setIsPlaying(true);
    setIsPaused(false);
    speakLine(index);
  };

  return (
    <div className="glass-card border border-indigo-500/20 overflow-hidden animate-fadeInUp">
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-indigo-500/5">
        <h2 className="text-lg font-bold text-text flex items-center gap-2">
          <FiHeadphones className="text-indigo-400" /> Audio Overview
        </h2>
        <div className="flex items-center gap-3">
          {!loading && !error && script.length > 0 && (
            <button
              onClick={() => { handleStop(); fetchScript(); }}
              className="text-text-muted hover:text-indigo-400 transition-colors flex items-center gap-1.5 text-sm"
            >
              <FiRotateCw size={14} /> Regenerate (3 ⚡)
            </button>
          )}
          <button onClick={() => { handleStop(); onClose(); }} className="text-text-muted hover:text-text transition-colors">
            <FiX size={18} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 flex items-center justify-center min-h-[400px]">
          <LoadingSpinner text="AI is writing your podcast script..." />
        </div>
      ) : error ? (
        <div className="p-12 flex flex-col items-center justify-center min-h-[400px] gap-4">
          <p className="text-danger text-center">{error}</p>
          <button onClick={fetchScript} className="btn-gradient text-sm flex items-center gap-2">
            <FiRotateCw size={14} /> Retry
          </button>
        </div>
      ) : (
        <>
          <div
            style={{
              background: currentLineIndex >= 0
                ? (SPEAKER_CONFIG[script[currentLineIndex]?.speaker] || SPEAKER_CONFIG['Host A']).gradient
                : 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15))',
            }}
            className="px-5 py-3 flex items-center gap-4 transition-all duration-500"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0"
              style={{
                background: 'rgba(0,0,0,0.25)',
                backdropFilter: 'blur(8px)',
                border: '2px solid rgba(255,255,255,0.15)',
              }}
            >
              {currentLineIndex >= 0
                ? (SPEAKER_CONFIG[script[currentLineIndex]?.speaker] || SPEAKER_CONFIG['Host A']).avatar
                : '🎙️'}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">
                {currentLineIndex >= 0
                  ? (SPEAKER_CONFIG[script[currentLineIndex]?.speaker] || SPEAKER_CONFIG['Host A']).label
                  : 'Ready to Play'}
              </p>
              <p className="text-white/60 text-xs truncate">
                {currentLineIndex >= 0
                  ? script[currentLineIndex]?.text.slice(0, 80) + (script[currentLineIndex]?.text.length > 80 ? '...' : '')
                  : `${script.length} exchanges · Tap play to begin`}
              </p>
            </div>

            {isPlaying && !isPaused && (
              <div className="flex items-end gap-[3px] h-6 shrink-0">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-[3px] rounded-full bg-white/60"
                    style={{
                      animation: `podcastWave 0.8s ease-in-out ${i * 0.1}s infinite alternate`,
                    }}
                  />
                ))}
              </div>
            )}

            {isPaused && (
              <span className="text-white/50 text-xs font-medium uppercase tracking-wider shrink-0">Paused</span>
            )}
          </div>

          <div className="h-1 bg-white/5 relative">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-center gap-4 py-4 bg-background/30 border-b border-white/5">
            <button
              onClick={handleSkipBack}
              disabled={currentLineIndex <= 0}
              className="w-10 h-10 rounded-full bg-white/5 text-text-muted flex items-center justify-center hover:bg-white/10 hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <FiSkipBack size={16} />
            </button>

            <button
              onClick={handlePlay}
              disabled={!voicesReady}
              className="w-14 h-14 rounded-full flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                boxShadow: voicesReady ? '0 4px 24px rgba(99,102,241,0.35)' : 'none',
              }}
            >
              {isPlaying && !isPaused ? <FiPause size={22} /> : <FiPlay size={22} style={{ marginLeft: 2 }} />}
            </button>

            <button
              onClick={handleSkipForward}
              disabled={currentLineIndex >= script.length - 1}
              className="w-10 h-10 rounded-full bg-white/5 text-text-muted flex items-center justify-center hover:bg-white/10 hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <FiSkipForward size={16} />
            </button>

            <button
              onClick={handleStop}
              className="w-10 h-10 rounded-full bg-white/5 text-text-muted flex items-center justify-center hover:bg-white/10 hover:text-danger transition-all"
            >
              <FiSquare size={14} />
            </button>

            <div className="flex items-center gap-1.5 text-xs text-text-muted ml-2">
              <FiVolume2 size={13} />
              <span>{currentLineIndex >= 0 ? `${currentLineIndex + 1}/${script.length}` : `0/${script.length}`}</span>
            </div>
          </div>

          <div
            ref={transcriptRef}
            className="overflow-y-auto custom-scrollbar"
            style={{ maxHeight: '360px' }}
          >
            {script.map((line, i) => {
              const cfg = SPEAKER_CONFIG[line.speaker] || SPEAKER_CONFIG['Host A'];
              const isActive = i === currentLineIndex;

              return (
                <div
                  key={i}
                  data-line-index={i}
                  onClick={() => handleLineClick(i)}
                  className="flex gap-3 px-5 py-3 cursor-pointer transition-all duration-300 border-b border-white/[0.03]"
                  style={{
                    background: isActive
                      ? `linear-gradient(90deg, ${cfg.color}15 0%, transparent 100%)`
                      : 'transparent',
                  }}
                >
                  <div className="shrink-0 mt-0.5">
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
                      style={{
                        background: isActive ? cfg.gradient : `${cfg.color}20`,
                        color: isActive ? '#fff' : cfg.color,
                        border: `1px solid ${cfg.color}${isActive ? '60' : '30'}`,
                        transition: 'all 0.3s',
                      }}
                    >
                      <span>{cfg.avatar}</span>
                      <span>{cfg.label}</span>
                    </div>
                  </div>

                  <p
                    className="text-sm leading-relaxed flex-1 transition-colors duration-300"
                    style={{
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                      fontWeight: isActive ? 500 : 400,
                    }}
                  >
                    {line.text}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}

      <style>{`
        @keyframes podcastWave {
          0% { height: 4px; }
          100% { height: 20px; }
        }
      `}</style>
    </div>
  );
};

export default PodcastPlayer;
