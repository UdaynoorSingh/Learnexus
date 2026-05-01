import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import WizzMascot from './WizzMascot';
import { X, Send, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { sendNexGuideQuery } from '../../services/aiService';

const AiTutorFab = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'nex',
      text: "Hey! I'm Nex, your personal guide to LearNexus. Ask me anything — like \"Where can I upload notes?\" or \"How do I practice for exams?\" — and I'll point you to the right place!",
      suggestions: []
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isChatOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isChatOpen]);

  const handleSend = async () => {
    const query = inputValue.trim();
    if (!query || isLoading) return;

    setMessages(prev => [...prev, { role: 'user', text: query, suggestions: [] }]);
    setInputValue('');
    setIsLoading(true);

    try {
      const data = await sendNexGuideQuery(query, location.pathname);
      setMessages(prev => [
        ...prev,
        {
          role: 'nex',
          text: data.message || "Hmm, I'm not sure about that. Try asking me about a feature!",
          suggestions: data.suggestions || []
        }
      ]);
    } catch (err) {
      console.error('Nex guide error:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'nex',
          text: "Oops! I ran into a hiccup. Try again in a moment — I'll be right here!",
          suggestions: []
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNavigate = (path) => {
    navigate(path);
    setIsChatOpen(false);
  };

  const breathingVariants = {
    idle: {
      scale: [1, 1.02, 1],
      transition: {
        duration: 3.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    hovered: {
      scale: 1.05,
      y: -10,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25
      }
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end pointer-events-none">
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="mb-4 w-[340px] sm:w-[380px] bg-white/95 backdrop-blur-xl border border-black/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl overflow-hidden pointer-events-auto"
          >
            <div className="bg-gradient-to-r from-[#6C4FD4] to-[#8B5CF6] p-4 flex items-center justify-between text-white shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/30">
                  <Sparkles size={16} className="text-yellow-200" />
                </div>
                <div>
                  <h3 className="font-bold font-['Outfit'] text-[15px] flex items-center gap-2 leading-none mb-0.5">
                    Nex Guide
                  </h3>
                  <p className="text-[10px] text-white/70 font-medium uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Website Navigator
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 h-[320px] overflow-y-auto bg-gradient-to-b from-slate-50/80 to-white/60 flex flex-col gap-3 scroll-smooth"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#d4d4d8 transparent' }}
            >
              {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30, delay: i === 0 ? 0.2 : 0 }}
                    className={`p-3 rounded-2xl text-sm leading-relaxed max-w-[88%] ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-[#6C4FD4] to-[#8B5CF6] text-white rounded-br-sm shadow-md shadow-violet-500/15'
                        : 'bg-white border border-black/[0.06] text-slate-700 rounded-tl-sm shadow-sm'
                    }`}
                  >
                    {msg.text}
                  </motion.div>

                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="flex flex-col gap-1.5 w-full max-w-[88%]">
                      {msg.suggestions.map((s, j) => (
                        <motion.button
                          key={j}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.15 + j * 0.08, type: 'spring', stiffness: 400, damping: 28 }}
                          onClick={() => handleNavigate(s.path)}
                          className="group flex items-center gap-3 w-full p-2.5 rounded-xl bg-gradient-to-r from-violet-50 to-fuchsia-50/50 border border-violet-200/50 hover:border-violet-300 hover:shadow-md hover:shadow-violet-500/10 transition-all duration-200 text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0 shadow-sm shadow-violet-500/20 group-hover:scale-105 transition-transform">
                            <ArrowRight size={14} className="text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-violet-900 truncate">{s.name}</p>
                            <p className="text-[11px] text-slate-500 leading-snug line-clamp-1">{s.description}</p>
                          </div>
                          <ArrowRight size={12} className="text-violet-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 self-start bg-white border border-black/[0.06] p-3 rounded-2xl rounded-tl-sm shadow-sm"
                >
                  <Loader2 size={14} className="text-violet-500 animate-spin" />
                  <span className="text-xs text-slate-400 font-medium">Nex is thinking…</span>
                </motion.div>
              )}

              <div ref={chatEndRef} />
            </div>
            
            <div className="p-3 bg-white/90 border-t border-black/[0.04] flex items-center gap-2">
              <input 
                ref={inputRef}
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Nex where to go…" 
                disabled={isLoading}
                className="flex-1 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#6C4FD4]/30 focus:border-[#6C4FD4]/50 transition-all outline-none placeholder:text-slate-400 disabled:opacity-50"
              />
              <button 
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                className="p-2.5 bg-gradient-to-br from-[#6C4FD4] to-[#8B5CF6] text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/25 transition-all shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="cursor-pointer pointer-events-auto drop-shadow-2xl relative"
        variants={breathingVariants}
        animate={isHovered ? "hovered" : "idle"}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setIsChatOpen(!isChatOpen)}
        whileTap={{ scale: 0.95 }}
      >

        <WizzMascot 
          className="w-[80px] sm:w-[100px] h-auto" 
          expression={isHovered ? 'happy' : 'default'} 
        />
      </motion.div>
    </div>
  );
};

export default AiTutorFab;
