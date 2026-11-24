import { useEffect, useRef } from "react";

/** Deteksi apakah perangkat adalah HP / ponsel cerdas atau tablet sentuh kecil. */
export function isMobileDevice(
  ua = "",
  touchPoints = 0,
  screenWidth = 1024,
): boolean {
  const mobileRegex =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|Silk/i;
  const isTouch = touchPoints > 0;
  const isSmallScreen = screenWidth <= 820;
  return Boolean(mobileRegex.test(ua) || (isTouch && isSmallScreen));
}

export function detectIsMobile(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent || "";
  const touchPoints = navigator.maxTouchPoints || 0;
  const width =
    window.innerWidth ||
    (window.matchMedia && window.matchMedia("(max-width: 820px)").matches
      ? 800
      : 1024);
  return isMobileDevice(ua, touchPoints, width);
}

/**
 * Focus Lock (anti-cheat).
 * Mendeteksi perpindahan tab (visibilitychange) atau kehilangan fokus
 * window (blur: pindah aplikasi / minimize) pada perangkat desktop.
 *
 * PENGECUALIAN HP/MOBILE:
 * Pada perangkat HP, layar mati (screen sleep, auto-lock, atau tombol power)
 * memicu event blur/visibilitychange yang sama persis dengan pindah aplikasi.
 * Sesuai kebijakan asesmen, akses HP dikecualikan dari pemutusan ujian otomatis
 * agar siswa yang layarnya mati saat berpikir/mencakar di kertas tidak terhenti
 * dan tetap dapat melanjutkan ujian selama sisa waktu masih ada.
 */
export function useAntiCheat(
  onViolation: () => void,
  options?: { enabled?: boolean },
): { isMobile: boolean } {
  const violationRef = useRef(onViolation);
  violationRef.current = onViolation;

  const isMobile = typeof window !== "undefined" ? detectIsMobile() : false;
  const enabled = options?.enabled ?? !isMobile;

  useEffect(() => {
    /* Bila pengecualian HP aktif, jangan dengarkan blur & visibilitychange */
    if (!enabled) return;

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
  }, [enabled]);

  return { isMobile };
}
