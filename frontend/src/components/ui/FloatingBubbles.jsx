import { motion } from 'framer-motion';

const bubbleConfigs = [
  { size: 320, color: 'rgba(139, 92, 246, 0.13)', left: '5%', top: '8%', duration: 7, delay: 0, blur: 60 },
  { size: 260, color: 'rgba(249, 115, 22, 0.11)', left: '72%', top: '3%', duration: 8.5, delay: 1.2, blur: 50 },
  { size: 380, color: 'rgba(244, 63, 94, 0.09)', left: '50%', top: '55%', duration: 9, delay: 0.6, blur: 70 },
  { size: 220, color: 'rgba(16, 185, 129, 0.12)', left: '18%', top: '68%', duration: 6.5, delay: 2, blur: 55 },
  { size: 300, color: 'rgba(59, 130, 246, 0.08)', left: '82%', top: '42%', duration: 7.5, delay: 0.3, blur: 65 },
  { size: 200, color: 'rgba(245, 158, 11, 0.13)', left: '-2%', top: '42%', duration: 6, delay: 1.5, blur: 45 },
  { size: 170, color: 'rgba(168, 85, 247, 0.10)', left: '38%', top: '18%', duration: 8, delay: 0.9, blur: 50 },
  { size: 240, color: 'rgba(236, 72, 153, 0.08)', left: '60%', top: '80%', duration: 7, delay: 1.8, blur: 55 },
];

const FloatingBubbles = ({ opacity = 1 }) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        opacity,
      }}
      aria-hidden="true"
    >
      {bubbleConfigs.map((bubble, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            width: bubble.size,
            height: bubble.size,
            borderRadius: '50%',
            background: `radial-gradient(circle at 35% 35%, ${bubble.color}, transparent 70%)`,
            left: bubble.left,
            top: bubble.top,
            filter: `blur(${bubble.blur}px)`,
          }}
          animate={{
            y: [0, -22, 0, 16, 0],
            x: [0, 10, 0, -8, 0],
            scale: [1, 1.05, 1, 0.96, 1],
          }}
          transition={{
            duration: bubble.duration,
            repeat: Infinity,
            delay: bubble.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

export default FloatingBubbles;
