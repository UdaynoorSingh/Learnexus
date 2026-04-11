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

export default function EmptyState({
  title,
  description,
  ctaLabel,
  to,
  onCtaClick,
  illustration = 'notes'
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="surface-card border border-white/10 rounded-2xl p-10 text-center max-w-lg mx-auto"
    >
      <EmptyStateIllustration variant={illustration} />
      <h3 className="mt-6 text-lg font-bold text-text tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-text-muted leading-relaxed">{description}</p>
      {ctaLabel && (to || onCtaClick) && (
        <div className="mt-8">
          {to ? (
            <Link to={to} className="btn-ai-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold">
              {ctaLabel}
            </Link>
          ) : (
            <button type="button" onClick={onCtaClick} className="btn-ai-primary px-6 py-3 rounded-xl text-sm font-semibold">
              {ctaLabel}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
