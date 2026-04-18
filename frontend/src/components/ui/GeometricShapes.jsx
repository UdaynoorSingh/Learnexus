import { motion } from 'framer-motion';

const ink = '#1e2029';

const shapes = [
  { fill: '#a78bfa', borderRadius: '1.25rem', delay: 0, duration: 3 },
  { fill: '#facc15', borderRadius: '50%', delay: 0.5, duration: 3.5 },
  { fill: '#6ee7b7', borderRadius: '50%', delay: 1, duration: 2.8 },
  { fill: '#f9a8d4', borderRadius: '1.25rem', delay: 0.3, duration: 3.2 },
];

const GeometricShapes = ({ className = '', size = 'default' }) => {
  const cardSize = size === 'sm' ? 'w-[240px] h-[240px]' : 'w-[300px] h-[300px] lg:w-[380px] lg:h-[380px]';
  const shapeSize = size === 'sm' ? 'w-20 h-20' : 'w-24 h-24 lg:w-28 lg:h-28';

  return (
    <div className={className} style={{ perspective: '1200px' }}>
      <motion.div
        className={`relative ${cardSize} rounded-[2rem] bg-white border-[3px] border-[#1e2029] grid grid-cols-2 gap-5 place-items-center p-7`}
        style={{
          transformStyle: 'preserve-3d',
          boxShadow: '10px 10px 0 0 #1e2029',
        }}
        animate={{
          rotateY: [-8, -4, -8],
          rotateX: [6, 2, 6],
          rotateZ: [4, 5, 4],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div
          className="absolute inset-0 rounded-[2rem] pointer-events-none opacity-40"
          style={{
            background:
              'radial-gradient(circle at 28% 22%, rgba(167,139,250,0.25), transparent 52%), radial-gradient(circle at 72% 78%, rgba(249,168,212,0.2), transparent 48%)',
          }}
        />

        {shapes.map((shape, i) => (
          <motion.div
            key={i}
            className={`${shapeSize} relative z-10 border-[3px]`}
            style={{
              backgroundColor: shape.fill,
              borderColor: ink,
              borderRadius: shape.borderRadius,
              boxShadow: '4px 4px 0 0 #1e2029',
            }}
            animate={{ y: [0, -10, 0] }}
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
