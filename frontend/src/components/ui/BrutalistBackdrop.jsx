import FloatingBubbles from './FloatingBubbles';


const BrutalistBackdrop = ({ bubbleOpacity = 0.72, className = '' }) => {
  return (
    <div className={`ln-backdrop-root pointer-events-none fixed inset-0 z-0 overflow-hidden ${className}`} aria-hidden="true">
      <div className="ln-dot-grid absolute inset-0" />
      <FloatingBubbles opacity={bubbleOpacity} />
    </div>
  );
};

export default BrutalistBackdrop;
