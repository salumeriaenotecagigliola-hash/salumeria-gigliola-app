import React, { useState, useRef, useCallback } from 'react';

export function useAllergenInteraction(onOpenFaq: () => void) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const onPointerDown = useCallback((alg: string, e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    e.stopPropagation();
    isLongPressRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onOpenFaq();
      setActiveTooltip(null);
    }, 500);
  }, [onOpenFaq]);

  const onPointerUp = useCallback((alg: string, e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    e.stopPropagation();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!isLongPressRef.current) {
      setActiveTooltip(prev => prev === alg ? null : alg);
    }
  }, []);

  const onClick = useCallback((alg: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nativeEvent = e.nativeEvent as PointerEvent;
    if (nativeEvent.pointerType === 'mouse' || nativeEvent.pointerType === undefined) {
      onOpenFaq();
    } else {
      // Prevent the default click behavior (like navigating or zooming) if it was a touch
      e.preventDefault();
    }
  }, [onOpenFaq]);

  return {
    activeTooltip,
    setActiveTooltip,
    handlers: (alg: string) => ({
      onPointerDown: (e: React.PointerEvent) => onPointerDown(alg, e),
      onPointerUp: (e: React.PointerEvent) => onPointerUp(alg, e),
      onPointerCancel: (e: React.PointerEvent) => {
        if (e.pointerType === 'touch' && timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      },
      onClick: (e: React.MouseEvent) => onClick(alg, e),
      onContextMenu: (e: React.MouseEvent) => {
         // Prevent context menu on long press
         e.preventDefault(); 
      }
    }),
  };
}
