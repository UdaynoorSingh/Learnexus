import { cn } from '../../utils/cn';

export default function Badge({ className, variant = 'default', ...props }) {
  const styles = {
    default: 'bg-black/5 text-text border border-black/10',
    primary: 'bg-primary/10 text-primary border border-primary/25',
    success: 'bg-success/10 text-success border border-success/25',
    warning: 'bg-warning/10 text-warning border border-warning/25',
    danger: 'bg-danger/10 text-danger border border-danger/25',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest',
        styles[variant] || styles.default,
        className
      )}
      {...props}
    />
  );
}

