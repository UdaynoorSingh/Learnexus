import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export function EmptyStateIllustration({ variant = 'notes' }) {
  if (variant === 'feed') {
    return (
      <svg viewBox="0 0 200 140" className="mx-auto w-48 h-auto text-primary/30" aria-hidden>
        <defs>
          <linearGradient id="esg1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <rect x="24" y="20" width="152" height="100" rx="12" fill="currentColor" className="text-surface" stroke="currentColor" strokeWidth="1" />
        <rect x="40" y="40" width="80" height="6" rx="3" fill="url(#esg1)" />
        <rect x="40" y="54" width="120" height="4" rx="2" fill="currentColor" className="text-text-muted/40" />
        <rect x="40" y="64" width="100" height="4" rx="2" fill="currentColor" className="text-text-muted/30" />
        <circle cx="160" cy="44" r="14" fill="url(#esg1)" className="opacity-80" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 200 160" className="mx-auto w-52 h-auto text-primary/25" aria-hidden>
      <defs>
        <linearGradient id="esn1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <path
        d="M48 32h104c6 0 10 4 10 10v88c0 6-4 10-10 10H48c-6 0-10-4-10-10V42c0-6 4-10 10-10z"
        fill="currentColor"
        className="text-surface"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.15"
      />
      <path d="M56 52h88M56 68h72M56 84h80" stroke="url(#esn1)" strokeWidth="4" strokeLinecap="round" />
      <rect x="56" y="100" width="40" height="10" rx="4" fill="url(#esn1)" opacity="0.5" />
    </svg>
  );
}

const gradientCtaClass =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:brightness-110 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-violet-400 focus-visible:ring-offset-white/90 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 shadow-violet-500/25';

const gradientCtaSecondaryClass =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:brightness-110 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-white/90 bg-gradient-to-r from-cyan-600 via-violet-600 to-fuchsia-500 shadow-cyan-500/20';

export default function EmptyState({
  title,
  description,
  ctaLabel,
  to,
  onCtaClick,
  secondaryCtaLabel,
  secondaryTo,
  onSecondaryCtaClick,
  vibrantCta = false,
  illustration = 'notes',
}) {
  const primaryClass = vibrantCta ? gradientCtaClass : 'btn-ai-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold';
  const secondaryClass = vibrantCta
    ? gradientCtaSecondaryClass
    : 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-300/90 bg-white/90 px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-violet-300 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50';

  const showPrimary = ctaLabel && (to || onCtaClick);
  const showSecondary = secondaryCtaLabel && (secondaryTo || onSecondaryCtaClick);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-slate-200/80 bg-white/85 p-10 text-center shadow-sm shadow-slate-900/5 backdrop-blur-sm max-w-lg mx-auto ring-1 ring-white/60"
    >
      <EmptyStateIllustration variant={illustration} />
      <h3 className="mt-6 text-lg font-bold text-slate-900 tracking-tight font-['Outfit']">{title}</h3>
      <p className="mt-2 text-sm text-slate-600 leading-relaxed">{description}</p>
      {(showPrimary || showSecondary) && (
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:justify-center">
          {showPrimary &&
            (to ? (
              <Link to={to} className={primaryClass}>
                {ctaLabel}
              </Link>
            ) : (
              <button type="button" onClick={onCtaClick} className={primaryClass}>
                {ctaLabel}
              </button>
            ))}
          {showSecondary &&
            (secondaryTo ? (
              <Link to={secondaryTo} className={secondaryClass}>
                {secondaryCtaLabel}
              </Link>
            ) : (
              <button type="button" onClick={onSecondaryCtaClick} className={secondaryClass}>
                {secondaryCtaLabel}
              </button>
            ))}
        </div>
      )}
    </motion.div>
  );
}
