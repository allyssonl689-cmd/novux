import { useEffect, useRef } from 'react';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'] as const;

export function useInactivityLogout(onLogout: () => void, active = true) {
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutRef  = useRef(onLogout);
  logoutRef.current = onLogout;

  useEffect(() => {
    if (!active) return;

    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => logoutRef.current(), INACTIVITY_TIMEOUT_MS);
    }

    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [active]);
}
