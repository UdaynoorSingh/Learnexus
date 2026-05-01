import { useState, useEffect, useRef } from 'react';

export const DEFAULT_AI_LOADING_MESSAGES = [
  'Analyzing syllabus...',
  'Vectorizing knowledge graph...',
  'Consulting community RAG...',
  'Finalizing roadmap...',
];


export default function AiLoadingState({
  isLoading,
  messages = DEFAULT_AI_LOADING_MESSAGES,
  className = '',
  size = 'lg',
  label = 'AI is working',
}) {
  const [messageIndex, setMessageIndex] = useState(0);
  const lenRef = useRef(messages.length);

  lenRef.current = Math.max(1, messages?.length || 1);

  useEffect(() => {
    if (!isLoading) return undefined;
    setMessageIndex(0);
    const id = setInterval(() => {
      setMessageIndex((i) => (i + 1) % lenRef.current);
    }, 2000);
    return () => clearInterval(id);
  }, [isLoading]);

  if (!isLoading) return null;

  const isCompact = size === 'sm';
  const spinnerDims = isCompact ? 'h-9 w-9 border-2' : 'h-14 w-14 border-[3px]';
  const rootAlign = isCompact ? 'items-start' : 'items-center';
  const textClass = isCompact
    ? 'mt-3 text-left text-xs font-medium text-slate-600 max-w-[14rem] leading-snug'
    : 'mt-5 text-center text-sm font-medium text-slate-600 max-w-md leading-relaxed px-2';

  const safeMessages = messages?.length ? messages : DEFAULT_AI_LOADING_MESSAGES;
  const line = safeMessages[messageIndex % safeMessages.length];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      className={`flex flex-col justify-center ${rootAlign} ${className}`.trim()}
    >
      <div className={`relative flex shrink-0 items-center justify-center ${isCompact ? 'h-9 w-9' : 'h-14 w-14'}`}>
        <div
          className={`pointer-events-none absolute inset-0 rounded-full bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-cyan-400 opacity-70 blur-xl ${isCompact ? 'scale-125' : 'scale-150'}`}
          aria-hidden
        />
        <div
          className={`relative rounded-full ${spinnerDims} animate-spin border-violet-500/25 border-t-violet-400 border-r-fuchsia-500 border-b-cyan-400/50 shadow-[0_0_18px_rgba(139,92,246,0.55),0_0_36px_rgba(6,182,212,0.18)] drop-shadow-[0_0_10px_rgba(167,139,250,0.5)]`}
        />
      </div>
      <p key={messageIndex} className={textClass}>
        {line}
      </p>
      {!isCompact && (
        <p className="mt-2 text-center text-[11px] font-medium uppercase tracking-widest text-slate-400">
          Powered by your AI backend
        </p>
      )}
    </div>
  );
}
