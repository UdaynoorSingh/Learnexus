import { motion } from 'framer-motion';

const bubbleConfigs = [
  { size: 420, color: 'rgba(253, 224, 71, 0.22)', left: '-6%', top: '-4%', duration: 5.8, delay: 0, blur: 72 },
  { size: 360, color: 'rgba(196, 181, 253, 0.2)', left: '68%', top: '-2%', duration: 6.4, delay: 0.4, blur: 68 },
  { size: 400, color: 'rgba(244, 194, 255, 0.18)', left: '8%', top: '62%', duration: 6.1, delay: 1.1, blur: 78 },
  { size: 280, color: 'rgba(167, 243, 208, 0.16)', left: '72%', top: '48%', duration: 5.5, delay: 0.2, blur: 62 },
  { size: 320, color: 'rgba(251, 207, 232, 0.2)', left: '42%', top: '12%', duration: 6.8, delay: 0.8, blur: 70 },
  { size: 260, color: 'rgba(216, 180, 254, 0.14)', left: '88%', top: '72%', duration: 5.9, delay: 1.6, blur: 58 },
];

const bounceEase = [0.34, 1.35, 0.64, 1];

const FloatingBubbles = ({ opacity = 1 }) => {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
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
            background: `radial-gradient(circle at 32% 32%, ${bubble.color}, transparent 72%)`,
            left: bubble.left,
            top: bubble.top,
            filter: `blur(${bubble.blur}px)`,
            willChange: 'transform',
          }}
          animate={{
            y: [0, -18, 2, -10, 0],
            x: [0, 10, -6, 4, 0],
            scale: [1, 1.06, 0.98, 1.03, 1],
          }}
          transition={{
            duration: bubble.duration,
            repeat: Infinity,
            delay: bubble.delay,
            ease: bounceEase,
            times: [0, 0.28, 0.52, 0.78, 1],
          }}
        />
      ))}
    </div>
  );
};

export default FloatingBubbles;
