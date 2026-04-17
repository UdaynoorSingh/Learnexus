import { cn } from '../../utils/cn';

export default function Button({ className, variant = 'primary', size = 'md', ...props }) {
  const variants = {
    primary: 'btn-gradient',
    secondary: 'btn-secondary-outline',
    ghost: 'bg-transparent hover:bg-black/5 text-text',
    danger: 'bg-danger/10 text-danger border border-danger/25 hover:bg-danger/15',
  };

  const sizes = {
    sm: 'text-sm px-4 py-2 rounded-xl',
    md: 'text-sm px-5 py-2.5 rounded-xl',
    lg: 'text-base px-6 py-3 rounded-2xl',
    icon: 'p-2.5 rounded-xl',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none',
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        className
      )}
      {...props}
    />
  );
}

