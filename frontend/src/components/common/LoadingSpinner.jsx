const LoadingSpinner = ({ size = 'md', text = '' }) => {
  const sizes = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4'
  };

  return (
    <div
      className="flex min-h-[12rem] flex-col items-center justify-center gap-3 py-10"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className={`${sizes[size]} border-primary border-t-transparent rounded-full animate-spin`}
        aria-hidden
      />
      {text ? (
        <p className="text-sm font-medium text-slate-600">{text}</p>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  );
};

export default LoadingSpinner;
