import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WizzMascot from './WizzMascot';
import { X, Send } from 'lucide-react';

const AiTutorFab = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Animation variants for the breathing effect
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
            className="mb-4 w-80 bg-white/95 backdrop-blur-xl border border-black/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl overflow-hidden pointer-events-auto"
          >
            {/* Chat Header */}
            <div className="bg-[#6C4FD4] p-4 flex items-center justify-between text-white shadow-sm">
              <div>
                <h3 className="font-bold font-['Outfit'] text-lg flex items-center gap-2 leading-none mb-1">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                  Nex
                </h3>
                <p className="text-[11px] text-white/80 font-medium uppercase tracking-widest">AI Tutor Online</p>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Chat Body */}
            <div className="p-4 h-64 overflow-y-auto bg-slate-50/50 flex flex-col gap-3">
              <div className="bg-white border border-black/5 p-3 rounded-2xl rounded-tl-sm text-sm text-text shadow-sm self-start max-w-[85%] leading-relaxed">
                Hi there! I'm Nex. Hovering around gets tiring, so I decided to settle down here. How can I help you study today?
              </div>
            </div>
            
            {/* Chat Input */}
            <div className="p-3 bg-white border-t border-black/5 flex items-center gap-2">
              <input 
                type="text" 
                placeholder="Ask Nex anything..." 
                className="flex-1 bg-slate-100 border border-transparent rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#6C4FD4]/30 focus:border-[#6C4FD4] transition-all outline-none"
              />
              <button className="p-2.5 bg-[#6C4FD4] text-white rounded-xl hover:bg-[#5A3EC0] transition-colors shadow-sm active:scale-95">
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
