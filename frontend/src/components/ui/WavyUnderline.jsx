import { motion } from 'framer-motion';

const WavyUnderline = ({
  children,
  color = '#f59e0b',
  strokeWidth = 3.5,
  className = '',
  animationDelay = 0.6,
}) => {
  return (
    <span className={`relative inline-block ${className}`}>
      <span className="relative z-10">{children}</span>
      <motion.svg
        className="absolute left-0 w-full pointer-events-none"
        style={{ bottom: '-0.1em', height: '0.35em' }}
        viewBox="0 0 200 14"
        fill="none"
        preserveAspectRatio="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, delay: animationDelay, ease: 'easeOut' }}
      >
        <motion.path
          d="M2 9 C 25 3, 45 13, 70 7 S 115 3, 140 9 S 175 4, 198 8"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: animationDelay, ease: 'easeOut' }}
        />
      </motion.svg>
    </span>
  );
};

export default WavyUnderline;
