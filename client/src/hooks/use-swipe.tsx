import { useRef, useEffect } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface SwipeOptions {
  threshold?: number; // Minimum distance for a swipe
  preventDefaultTouchmoveEvent?: boolean;
  trackMouse?: boolean; // Track mouse events for testing on desktop
}

export function useSwipe(
  handlers: SwipeHandlers,
  options: SwipeOptions = {}
) {
  const {
    threshold = 100,
    preventDefaultTouchmoveEvent = false,
    trackMouse = false
  } = options;

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleStart = (clientX: number, clientY: number) => {
      touchStartRef.current = {
        x: clientX,
        y: clientY,
        time: Date.now()
      };
    };

    const handleEnd = (clientX: number, clientY: number) => {
      if (!touchStartRef.current) return;

      const deltaX = clientX - touchStartRef.current.x;
      const deltaY = clientY - touchStartRef.current.y;
      const deltaTime = Date.now() - touchStartRef.current.time;
      
      // Only consider swipes that are fast enough (within 300ms)
      if (deltaTime > 300) {
        touchStartRef.current = null;
        return;
      }

      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Determine if this is a horizontal or vertical swipe
      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (absDeltaX > threshold) {
          if (deltaX > 0) {
            handlers.onSwipeRight?.();
          } else {
            handlers.onSwipeLeft?.();
          }
        }
      } else {
        // Vertical swipe
        if (absDeltaY > threshold) {
          if (deltaY > 0) {
            handlers.onSwipeDown?.();
          } else {
            handlers.onSwipeUp?.();
          }
        }
      }

      touchStartRef.current = null;
    };

    // Touch events
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      handleEnd(touch.clientX, touch.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (preventDefaultTouchmoveEvent) {
        e.preventDefault();
      }
    };

    // Mouse events (for desktop testing)
    let mouseDown = false;
    const handleMouseDown = (e: MouseEvent) => {
      if (!trackMouse) return;
      mouseDown = true;
      handleStart(e.clientX, e.clientY);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!trackMouse || !mouseDown) return;
      mouseDown = false;
      handleEnd(e.clientX, e.clientY);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!trackMouse || !mouseDown) return;
      if (preventDefaultTouchmoveEvent) {
        e.preventDefault();
      }
    };

    // Add event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefaultTouchmoveEvent });

    if (trackMouse) {
      element.addEventListener('mousedown', handleMouseDown);
      element.addEventListener('mouseup', handleMouseUp);
      element.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchmove', handleTouchMove);

      if (trackMouse) {
        element.removeEventListener('mousedown', handleMouseDown);
        element.removeEventListener('mouseup', handleMouseUp);
        element.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, [handlers, threshold, preventDefaultTouchmoveEvent, trackMouse]);

  return elementRef;
}