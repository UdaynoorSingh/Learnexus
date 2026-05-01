import { cn } from '../../utils/cn';

export default function Chip({ className, variant = 'neutral', size = 'sm', ...props }) {
  const variants = {
    neutral: 'bg-white/70 text-text-muted border border-black/10 hover:bg-white/90 hover:text-text hover:border-black/20',
    primary: 'bg-primary/12 text-primary border border-primary/25',
    accent: 'bg-accent/12 text-accent border border-accent/25',
    secondary: 'bg-secondary/12 text-secondary border border-secondary/25',
    success: 'bg-success/12 text-success border border-success/25',
    warning: 'bg-warning/12 text-warning border border-warning/25',
    danger: 'bg-danger/12 text-danger border border-danger/25',
    ink: 'ln-neo-pill text-text border-2 border-[var(--ln-ink)] bg-white shadow-[3px_3px_0_0_var(--ln-ink)]',
  };

  const sizes = {
    xs: 'text-[10px] px-2.5 py-1 rounded-lg',
    sm: 'text-[11px] px-3 py-1.5 rounded-xl',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold tracking-tight',
        sizes[size] || sizes.sm,
        variants[variant] || variants.neutral,
        className
      )}
      {...props}
    />
  );
}

