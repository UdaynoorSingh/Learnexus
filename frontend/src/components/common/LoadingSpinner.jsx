const LoadingSpinner = ({ size = 'md', text = '' }) => {
  const sizes = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4'
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div className={`${sizes[size]} border-primary border-t-transparent rounded-full animate-spin`}></div>
      {text && <p className="text-text-muted text-sm">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
