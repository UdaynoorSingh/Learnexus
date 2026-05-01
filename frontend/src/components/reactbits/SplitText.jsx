

import { useMemo } from 'react';
import { motion } from 'framer-motion';

export default function SplitText({
  text = '',
  className = '',
  delay = 50,
  duration = 0.5,
  ease = 'easeOut',
  splitType = 'chars', 
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  tag = 'p',
  threshold = 0.1,
  textAlign = 'center',
  onLetterAnimationComplete,
}) {
  const Tag = motion[tag] || motion.p;

  const items = useMemo(() => {
    if (splitType === 'words') {
      return text.split(' ').map((word, i) => ({ content: word, key: `w-${i}` }));
    }
    return text.split('').map((char, i) => ({
      content: char === ' ' ? '\u00A0' : char,
      key: `c-${i}`,
    }));
  }, [text, splitType]);

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: delay / 1000,
      },
    },
  };

  const childVariants = {
    hidden: from,
    visible: {
      ...to,
      transition: { duration, ease },
    },
  };

  return (
    <Tag
      className={`split-parent ${className}`}
      style={{ textAlign, overflow: 'hidden', display: 'inline-block', whiteSpace: 'normal', wordWrap: 'break-word' }}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: threshold }}
      onAnimationComplete={onLetterAnimationComplete}
    >
      {items.map(({ content, key }) => (
        <motion.span
          key={key}
          variants={childVariants}
          style={{
            display: 'inline-block',
            willChange: 'transform, opacity',
          }}
        >
          {content}
          {splitType === 'words' ? '\u00A0' : ''}
        </motion.span>
      ))}
    </Tag>
  );
}
