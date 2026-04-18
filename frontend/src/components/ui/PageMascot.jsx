import { motion } from 'framer-motion';
import { getPageMascot } from '../../constants/mascots';

const sizeClasses = {
  sm: 'w-16 h-auto sm:w-20',
  md: 'w-20 h-auto sm:w-28',
  lg: 'w-24 h-auto md:w-32',
  xl: 'w-28 h-auto sm:w-40 md:w-48',
  hero: 'w-[120px] h-auto sm:w-[150px] xl:w-[180px]',
};

const defaultTransition = {
  opacity: { duration: 0.45, delay: 0.15 },
  y: { duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.35 },
};

/**
 * Renders the mascot chosen for a top-level app page (see `constants/mascots.js`).
 *
 * @param {keyof import('../../constants/mascots').PAGE_MASCOTS} role
 * @param {'sm'|'md'|'lg'|'xl'|'hero'} [size='md']
 * @param {boolean} [float=true] gentle vertical float
 * @param {string} [className]
 * @param {boolean} [hideOnMobile] hide below `sm` when true
 */
const PageMascot = ({
  role,
  size = 'md',
  float = true,
  className = '',
  hideOnMobile = false,
}) => {
  const { src, alt } = getPageMascot(role);
  const dim = sizeClasses[size] || sizeClasses.md;
  const visibility = hideOnMobile ? 'hidden sm:block' : '';

  return (
    <motion.img
      src={src}
      alt={alt}
      draggable={false}
      className={`${dim} object-contain drop-shadow-xl select-none ${visibility} ${className}`.trim()}
      initial={{ opacity: 0, y: 10 }}
      animate={
        float
          ? { opacity: 1, y: [0, -6, 0] }
          : { opacity: 1, y: 0 }
      }
      transition={float ? defaultTransition : { opacity: { duration: 0.4 } }}
    />
  );
};

export default PageMascot;
