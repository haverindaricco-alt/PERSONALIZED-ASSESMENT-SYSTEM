import { useEffect, useRef } from "react";

/**
 * Focus Lock (anti-cheat).
 * Mendeteksi perpindahan tab (visibilitychange) atau kehilangan fokus
 * window (blur: pindah aplikasi / minimize). Memicu onViolation
 * tepat satu kali lalu kuas dibongkar.
 */
export function useAntiCheat(onViolation: () => void): void {
  const violationRef = useRef(onViolation);
  violationRef.current = onViolation;

  useEffect(() => {
    let fired = false;

    const hit = () => {
      if (fired) return;
      fired = true;
      violationRef.current();
    };

    const onVisibility = () => {
      if (document.hidden) hit();
    };

    window.addEventListener("blur", hit);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", hit);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}
