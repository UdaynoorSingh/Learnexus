import { cn } from '../../utils/cn';

export default function Button({ className, variant = 'primary', size = 'md', ...props }) {
  const variants = {
    primary: 'btn-gradient',
    secondary: 'btn-secondary-outline',
    soft: 'bg-white/70 border border-black/10 text-text hover:text-text hover:bg-white/90 hover:border-black/20',
    ghost: 'bg-transparent hover:bg-black/5 text-text',
    danger: 'bg-danger/10 text-danger border border-danger/25 hover:bg-danger/15',
    ink: 'ln-neo-primary',
  };

  const sizes = {
    sm: 'text-sm px-4 py-2 rounded-xl min-h-[40px]',
    md: 'text-sm px-5 py-2.5 rounded-xl min-h-[44px]',
    lg: 'text-base px-6 py-3 rounded-2xl min-h-[48px]',
    icon: 'p-2.5 rounded-xl min-h-[44px] min-w-[44px]',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white/60',
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        className
      )}
      {...props}
    />
  );
}

