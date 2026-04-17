import { motion } from 'framer-motion';

const shapes = [
  { color: '#8b5cf6', borderRadius: '1.25rem', delay: 0, duration: 3 },      // Purple square
  { color: '#f59e0b', borderRadius: '50%', delay: 0.5, duration: 3.5 },      // Yellow circle
  { color: '#10b981', borderRadius: '50%', delay: 1, duration: 2.8 },        // Green circle
  { color: '#ec4899', borderRadius: '1.25rem', delay: 0.3, duration: 3.2 },  // Pink square
];

const GeometricShapes = ({ className = '', size = 'default' }) => {
  const cardSize = size === 'sm' ? 'w-[240px] h-[240px]' : 'w-[300px] h-[300px] lg:w-[380px] lg:h-[380px]';
  const shapeSize = size === 'sm' ? 'w-20 h-20' : 'w-24 h-24 lg:w-28 lg:h-28';

  return (
    <div className={className} style={{ perspective: '1200px' }}>
      <motion.div
        className={`relative ${cardSize} rounded-[2rem] bg-white/50 backdrop-blur-2xl border-2 border-black/8 shadow-2xl shadow-black/8 grid grid-cols-2 gap-5 place-items-center p-7`}
        style={{ transformStyle: 'preserve-3d' }}
        animate={{
          rotateY: [-7, -3, -7],
          rotateX: [5, 1, 5],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Subtle inner glow */}
        <div
          className="absolute inset-0 rounded-[2rem] pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 30% 25%, rgba(139,92,246,0.06), transparent 50%), radial-gradient(circle at 70% 75%, rgba(236,72,153,0.05), transparent 50%)',
          }}
        />

        {shapes.map((shape, i) => (
          <motion.div
            key={i}
            className={`${shapeSize} relative z-10`}
            style={{
              backgroundColor: shape.color,
              borderRadius: shape.borderRadius,
              boxShadow: `0 8px 30px ${shape.color}33`,
            }}
            animate={{ y: [0, -8, 0] }}
            transition={{
              duration: shape.duration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: shape.delay,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
};

export default GeometricShapes;
