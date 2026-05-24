import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { motion, useAnimation } from 'motion/react';

interface Props {
  children: React.ReactNode;
  onRefresh: () => void;
}

export default function PullToRefresh({ children, onRefresh }: Props) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const controls = useAnimation();
  const threshold = 120; // Distance to trigger refresh

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Only allow pull to refresh if at the top of the scroll
      if (window.scrollY === 0) {
        startY.current = e.touches[0].pageY;
      } else {
        startY.current = -1;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startY.current === -1 || isRefreshing) return;

      const currentY = e.touches[0].pageY;
      const diff = currentY - startY.current;

      if (diff > 0) {
        // Resistance effect: move slower the further we pull
        const distance = Math.pow(diff, 0.85);
        setPullDistance(distance);
        
        // Prevent browser default pull-to-refresh if possible
        if (distance > 10) {
          if (e.cancelable) e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      if (pullDistance > threshold && !isRefreshing) {
        handleRefresh();
      } else {
        setPullDistance(0);
      }
      startY.current = -1;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, isRefreshing]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setPullDistance(threshold);
    
    // Smooth vibration feedback
    if (window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }

    setTimeout(() => {
      onRefresh();
      // Reset state if window hasn't reloaded (though onRefresh calls reload)
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 500);
    }, 800);
  };

  return (
    <div className="relative">
      <motion.div 
        className="absolute top-0 left-0 right-0 flex justify-center items-center pointer-events-none z-[1000]"
        style={{ height: pullDistance }}
        animate={{ height: pullDistance }}
        transition={isRefreshing ? { type: "spring", stiffness: 200, damping: 25 } : { type: "tween", duration: 0 }}
      >
        <div 
          className={`bg-brand-black text-brand-gold p-3 rounded-full shadow-2xl border-2 border-brand-gold/30 transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
          style={{ 
            opacity: Math.min(pullDistance / threshold, 1),
            transform: `scale(${Math.min(pullDistance / threshold, 1)}) rotate(${pullDistance * 2}deg)`
          }}
        >
          <RefreshCw size={20} />
        </div>
      </motion.div>
      <motion.div
        animate={{ y: pullDistance }}
        transition={isRefreshing ? { type: "spring", stiffness: 200, damping: 25 } : { type: "tween", duration: 0 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
