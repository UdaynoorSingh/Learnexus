import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import WizzMascot from './WizzMascot';

const GlobalRoamingMascot = () => {
  const [position, setPosition] = useState({ x: -200, y: -200 }); 
  const [rotation, setRotation] = useState(0);
  const [scaleX, setScaleX] = useState(1);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const size = 120; 
    
    const initX = Math.random() * (window.innerWidth - size);
    const initY = Math.random() * (window.innerHeight - size * 1.5);
    setPosition({ x: initX, y: initY });
    setIsInitialized(true);

    const moveMascot = () => {
      const nextX = Math.random() * (window.innerWidth - size);
      const nextY = Math.random() * (window.innerHeight - size * 1.5);
      
      setPosition(prev => {
        const isMovingRight = nextX > prev.x;
    
        setScaleX(isMovingRight ? -1 : 1);
        
        const isMovingUp = nextY < prev.y;
        const rot = isMovingUp ? (isMovingRight ? 15 : -15) : (isMovingRight ? -5 : 5);
        setRotation(rot);
        
        return { x: nextX, y: nextY };
      });
    };

    const timeoutId = setTimeout(moveMascot, 1000);
    const intervalId = setInterval(moveMascot, 18000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  if (!isInitialized) return null;

  return (
    <motion.div
      className="fixed z-[100] pointer-events-none drop-shadow-2xl"
      animate={{
        x: position.x,
        y: position.y,
        rotate: rotation,
        scaleX: scaleX,
      }}
      transition={{
        duration: 18,
        ease: "easeInOut",
      }}
    >
      <WizzMascot className="w-[100px] sm:w-[130px] h-auto opacity-80" />
    </motion.div>
  );
};

export default GlobalRoamingMascot;
