import { useCallback, useEffect, useRef, useState } from "react";

export function useHiddenOverlay(delay = 3000) {
  const [isVisible, setIsVisible] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const startTimer = useCallback(() => {
    clearTimer();
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, delay);
  }, [delay]);

  const resetTimer = useCallback(() => {
    setIsVisible(true);
    startTimer();
  }, [startTimer]);
  const lockTimer = useCallback(() => {
    setIsVisible(true);
    clearTimer();
  }, [startTimer]);

  const hideOverlay = useCallback(() => {
    setIsVisible(false);
    clearTimer();
  }, []);

  useEffect(() => {
    startTimer();
    return () => clearTimer();
  }, [startTimer]);

  return { isVisible, hideOverlay, resetTimer, setIsVisible, lockTimer };
}
