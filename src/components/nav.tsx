import { useState, useEffect, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Brain,
  ArrowRight,
  ArrowLeft,
  Menu,
  X,
  Clock,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from "lucide-react";

/* ============================================================
   Hook deteksi scroll untuk efek elevasi dinamis
   ============================================================ */
export function useScrollScrolled(threshold = 12) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > threshold);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

/* ============================================================
   Logo Brand Modern dengan Glow Ring & Agnes AI Badge
   ============================================================ */
export function BrandLogo({
  size = "md",
  showSubtitle = true,
}: {
  size?: "sm" | "md";
  showSubtitle?: boolean;
}) {
  const isSm = size === "sm";
  return (
    <div className="flex items-center gap-2.5 select-none group">
      <div
        className={`relative flex items-center justify-center rounded-full bg-gradient-to-tr from-primary to-focus text-white shadow-sm shadow-primary/25 transition-transform duration-200 group-hover:scale-105 ${
          isSm ? "size-7" : "size-8 sm:size-9"
        }`}
      >
        <Brain className={isSm ? "size-4" : "size-4 sm:size-5"} strokeWidth={2} />
        <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-ok ring-2 ring-white" />
      </div>
      <div className="flex flex-col text-left">
        <span className="font-semibold tracking-tight text-ink text-sm sm:text-[15px] leading-tight">
          Personalized Assessment
        </span>
        {showSubtitle && (
          <span className="text-[10px] text-ink-48 leading-none hidden sm:inline-flex items-center gap-1 mt-0.5">
            <Sparkles className="size-2.5 text-primary" /> Agnes AI &bull; Focus Lock
          </span>
        )}
      </div>
    </div>
  );
}

export interface NavSectionLink {
  id: string;
  label: string;
}

/* ============================================================
   1. LANDING NAVBAR (Halaman Utama / Beranda)
   Floating capsule glassmorphism dengan logo, anchor links,
   tombol CTA "Mulai Ujian", dan responsive mobile drawer.
   ============================================================ */
export function LandingNavbar({
  links = [
    { id: "simulasi", label: "Simulasi" },
    { id: "fitur", label: "Fitur" },
    { id: "alur", label: "Alur" },
    { id: "faq", label: "FAQ" },
  ],
}: {
  links?: NavSectionLink[];
}) {
  const scrolled = useScrollScrolled(12);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  function jump(id: string) {
    setMobileOpen(false);
    const elem = document.getElementById(id);
    if (elem) {
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      elem.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    }
  }

  return (
    <header className="fixed top-3 sm:top-5 inset-x-0 z-50 flex justify-center px-4 sm:px-6 pointer-events-none">
      <div className="relative w-full max-w-5xl pointer-events-auto">
        <nav
          aria-label="Navigasi Beranda"
          className={`flex items-center justify-between rounded-full px-3.5 py-2 sm:px-5 sm:py-2.5 ${
            scrolled ? "floating-capsule-scrolled" : "floating-capsule"
          }`}
        >
          {/* Logo & Brand */}
          <Link to="/" className="press focus-ring rounded-full">
            <BrandLogo />
          </Link>

          {/* Desktop Center Links */}
          <div className="hidden md:flex items-center gap-1 bg-ink/[0.03] p-1 rounded-full border border-hairline/40">
            {links.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => jump(link.id)}
                className="press focus-ring rounded-full px-3.5 py-1 text-caption-strong text-ink-80 hover:text-ink hover:bg-white/80 transition-all"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden sm:flex items-center gap-2">
            <Link
              to="/admin/login"
              className="press focus-ring rounded-full px-3 py-1.5 text-caption-strong text-ink-48 hover:text-ink hover:bg-ink/5 transition-colors"
            >
              Portal Admin
            </Link>
            <Link
              to="/student/entry"
              className="press focus-ring inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-caption-strong text-white hover:bg-focus shadow-sm shadow-primary/25 transition-all"
            >
              <span>Mulai Ujian</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {/* Mobile Right Controls */}
          <div className="flex sm:hidden items-center gap-2">
            <Link
              to="/student/entry"
              className="press focus-ring inline-flex items-center rounded-full bg-primary px-3 py-1.5 text-caption-strong text-white hover:bg-focus shadow-xs"
            >
              Mulai
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="press focus-ring flex size-9 items-center justify-center rounded-full bg-pearl border border-hairline text-ink"
              aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </nav>

        {/* Mobile Dropdown Drawer */}
        {mobileOpen && (
          <div className="absolute top-full mt-2 inset-x-0 mx-1 p-4 rounded-3xl floating-capsule-scrolled shadow-2xl flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-48 px-3 py-1">
                Navigasi
              </span>
              {links.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => jump(link.id)}
                  className="press focus-ring flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-body-strong text-ink hover:bg-pearl transition-colors"
                >
                  <span>{link.label}</span>
                  <ChevronRight className="size-4 text-ink-48" />
                </button>
              ))}
            </div>

            <div className="h-px bg-hairline/80 my-1" />

            <div className="flex flex-col gap-2 pt-1">
              <Link
                to="/student/entry"
                className="press focus-ring flex items-center justify-center gap-2 rounded-full bg-primary py-3 text-body-strong text-white shadow-sm shadow-primary/30"
              >
                <span>Mulai Ujian Siswa</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/admin/login"
                className="press focus-ring flex items-center justify-center rounded-full border border-hairline bg-pearl py-2.5 text-caption-strong text-ink hover:bg-hairline/30"
              >
                Portal Admin
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

/* ============================================================
   2. APP NAVBAR (Hasil Ujian, Dashboard Admin)
   Kapsul floating elegan dengan brand logo, label halaman/badge,
   dan area actions di sisi kanan.
   ============================================================ */
export function AppNavbar({
  title,
  badge,
  actions,
  showHomeLink = true,
}: {
  title?: string;
  badge?: string;
  actions?: ReactNode;
  showHomeLink?: boolean;
}) {
  const scrolled = useScrollScrolled(12);

  return (
    <header className="fixed top-3 sm:top-5 inset-x-0 z-50 flex justify-center px-4 sm:px-6 pointer-events-none">
      <div className="relative w-full max-w-6xl pointer-events-auto">
        <nav
          aria-label="Navigasi Aplikasi"
          className={`flex items-center justify-between rounded-full px-3.5 py-2 sm:px-5 sm:py-2.5 ${
            scrolled ? "floating-capsule-scrolled" : "floating-capsule"
          }`}
        >
          {/* Sisi Kiri: Brand & Title */}
          <div className="flex items-center gap-3">
            {showHomeLink ? (
              <Link to="/" className="press focus-ring rounded-full">
                <BrandLogo size="sm" showSubtitle={false} />
              </Link>
            ) : (
              <BrandLogo size="sm" showSubtitle={false} />
            )}

            {title && (
              <>
                <span className="hidden sm:inline text-hairline">/</span>
                <div className="flex items-center gap-2">
                  <span className="text-tagline font-medium text-ink truncate max-w-[150px] sm:max-w-none">
                    {title}
                  </span>
                  {badge && (
                    <span className="rounded-full bg-primary/10 text-primary text-[11px] font-medium px-2 py-0.5">
                      {badge}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Sisi Kanan: Actions */}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </nav>
      </div>
    </header>
  );
}

/* ============================================================
   3. QUIZ NAVBAR (Saat Sesi Ujian Berjalan)
   Kapsul floating khusus kuis: menampilkan nama siswa,
   badge Focus Lock, progress ringkas, dan timer dinamis.
   ============================================================ */
export function QuizNavbar({
  studentName,
  remainingText,
  timerTone,
  questionProgress,
}: {
  studentName: string;
  remainingText: string;
  timerTone?: string;
  questionProgress?: { current: number; total: number };
}) {
  const scrolled = useScrollScrolled(12);
  const initial = studentName.trim().charAt(0).toUpperCase() || "S";

  return (
    <header className="fixed top-3 sm:top-5 inset-x-0 z-40 flex justify-center px-4 sm:px-6 pointer-events-none">
      <div className="relative w-full max-w-4xl pointer-events-auto">
        <nav
          aria-label="Navigasi Ujian"
          className={`flex items-center justify-between rounded-full px-3.5 py-2 sm:px-5 sm:py-2.5 ${
            scrolled ? "floating-capsule-scrolled" : "floating-capsule"
          }`}
        >
          {/* Siswa */}
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-gradient-to-tr from-primary to-focus text-white flex items-center justify-center text-xs font-semibold shadow-xs">
              {initial}
            </div>
            <div className="flex flex-col">
              <span className="text-body-strong text-ink truncate max-w-[120px] sm:max-w-[220px]">
                {studentName}
              </span>
              <span className="text-[10px] text-ink-48 hidden xs:block">
                Sesi Ujian Aktif
              </span>
            </div>
          </div>

          {/* Focus Lock & Progress (Layar Tengah / Lebar) */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-1.5 rounded-full bg-ok/10 text-ok px-2.5 py-1 text-[11px] font-medium border border-ok/20">
              <ShieldCheck className="size-3.5" />
              <span>Focus Lock Aktif</span>
            </div>

            {questionProgress && (
              <span className="hidden sm:inline-block text-caption text-ink-48 tabular-nums bg-pearl px-2.5 py-1 rounded-full border border-hairline/60">
                Soal <strong className="text-ink">{questionProgress.current}</strong> / {questionProgress.total}
              </span>
            )}

            {/* Timer Capsule Dinamis */}
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-caption-strong tabular-nums shadow-xs transition-colors ${
                timerTone || "bg-pearl text-ink border border-hairline"
              }`}
            >
              <Clock className="size-4" strokeWidth={2} />
              <span>{remainingText}</span>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}

/* ============================================================
   4. MINIMAL NAV (Entry Masuk Ujian & Admin Login)
   Kapsul ringkas dengan logo dan tombol kembali ke Beranda.
   ============================================================ */
export function MinimalNav({
  backLabel = "Kembali ke Beranda",
  backTo = "/",
}: {
  backLabel?: string;
  backTo?: string;
}) {
  const scrolled = useScrollScrolled(12);

  return (
    <header className="fixed top-3 sm:top-5 inset-x-0 z-50 flex justify-center px-4 sm:px-6 pointer-events-none">
      <div className="relative w-full max-w-4xl pointer-events-auto">
        <nav
          aria-label="Navigasi Halaman"
          className={`flex items-center justify-between rounded-full px-3.5 py-2 sm:px-5 sm:py-2.5 ${
            scrolled ? "floating-capsule-scrolled" : "floating-capsule"
          }`}
        >
          <Link to="/" className="press focus-ring rounded-full">
            <BrandLogo size="sm" showSubtitle={false} />
          </Link>

          <Link
            to={backTo}
            className="press focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-caption-strong text-ink-48 hover:text-ink hover:bg-ink/5 transition-all"
          >
            <ArrowLeft className="size-3.5" />
            <span className="hidden xs:inline">{backLabel}</span>
            <span className="xs:hidden">Beranda</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

/* ============================================================
   Backward Compatibility Helpers
   Untuk kode yang masih memanggil GlobalNav, SubNav, FloatingStickyBar
   ============================================================ */
export function GlobalNav({ brand }: { brand: string }) {
  return <AppNavbar title={brand} />;
}

export function SubNav({
  title,
  actions,
}: {
  title: string;
  actions?: ReactNode;
}) {
  return <AppNavbar title={title} actions={actions} />;
}

export function FloatingStickyBar({ children }: { children: ReactNode }) {
  return (
    <div className="frosted fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-between px-4 sm:px-8 border-t border-hairline/80">
      {children}
    </div>
  );
}
