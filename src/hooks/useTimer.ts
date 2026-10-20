import { useEffect, useRef, useState } from "react";

/**
 * Countdown menuju deadline. Mengembalikan sisa waktu (ms).
 * onExpire dipanggil tepat satu kali saat waktu habis.
 */
export function useTimer(deadlineMs: number, onExpire: () => void): number {
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, deadlineMs - Date.now()),
  );

  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
    if (deadlineMs <= Date.now()) {
      setRemainingMs(0);
      if (!firedRef.current) {
        firedRef.current = true;
        expireRef.current();
      }
      return;
    }

    const tick = () => {
      const remaining = deadlineMs - Date.now();
      if (remaining <= 0) {
        setRemainingMs(0);
        if (!firedRef.current) {
          firedRef.current = true;
          expireRef.current();
        }
        return;
      }
      setRemainingMs(remaining);
    };

    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [deadlineMs]);

  return remainingMs;
}
