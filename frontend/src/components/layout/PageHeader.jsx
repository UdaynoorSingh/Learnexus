
const PageHeader = ({ eyebrow, title, description, children, className = '' }) => {
  return (
    <header className={`border-b border-slate-200/70 pb-6 mb-8 ${className}`.trim()}>
      {eyebrow && (
        <p className="text-[11px] font-semibold uppercase tracking-widest text-violet-600/90 mb-2">{eyebrow}</p>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-['Outfit']">{title}</h1>
          {description && (
            <p className="text-sm text-slate-600 mt-2 max-w-2xl leading-relaxed">{description}</p>
          )}
        </div>
        {children ? <div className="flex shrink-0 flex-wrap items-center gap-3 sm:justify-end">{children}</div> : null}
      </div>
    </header>
  );
};

export default PageHeader;
