import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import type { IndicatorSummary } from "../types";
import {
  MASTERY_COLOR,
  masteryOf,
  formatScore,
 } from "../lib/scoring";

/* ============================================================
   Pustaka antarmuka dari design system Apple.
   - Semua CTA biru Action #0066cc, pill, active scale(0.95)
   - Kartu: radius 18px, hairline 1px, tanpa shadow
   - Fokus keyboard: outline 2px #0071e3
   ============================================================ */

const press = "press focus-ring select-none";

export const btnPrimaryClass =
  press +
  " inline-flex items-center justify-center gap-2 rounded-pill bg-primary px-[22px] py-[11px] text-body text-white disabled:pointer-events-none disabled:opacity-35";

export const btnGhostClass =
  press +
  " inline-flex items-center justify-center gap-2 rounded-pill border border-primary px-[22px] py-[11px] text-body text-primary disabled:pointer-events-none disabled:opacity-35";

export const btnDarkUtilityClass =
  press +
  " inline-flex items-center justify-center gap-2 rounded-util bg-ink px-[15px] py-2 text-btn-utility text-white disabled:pointer-events-none disabled:opacity-40";

export const btnPearlClass =
  press +
  " inline-flex items-center justify-center gap-2 rounded-chip border-[3px] border-divider bg-pearl px-[14px] py-2 text-caption text-ink-80 disabled:pointer-events-none disabled:opacity-40";

export type ButtonVariant = "primary" | "ghost" | "dark" | "pearl";

const variantClass: Record<ButtonVariant, string> = {
  primary: btnPrimaryClass,
  ghost: btnGhostClass,
  dark: btnDarkUtilityClass,
  pearl: btnPearlClass,
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={variantClass[variant] + " " + className}
      {...rest}
    />
  );
}

export function Card({
  className = "",
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={"rounded-card border border-hairline bg-canvas " + className} {...rest}>
      {children}
    </div>
  );
}

export const inputClass =
  "focus-ring h-11 w-full rounded-pill border border-black/10 bg-canvas px-5 text-body text-ink placeholder:text-ink-48";

export const textareaClass =
  "focus-ring w-full rounded-util border border-black/10 bg-canvas px-4 py-3 text-body text-ink placeholder:text-ink-48";

export const selectClass =
  "focus-ring h-11 w-full rounded-util border border-black/10 bg-canvas px-4 text-body text-ink";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-caption-strong text-ink">{label}</label>
      {children}
      {hint && <p className="text-caption text-ink-48">{hint}</p>}
      {error && <p className="text-caption text-bad">{error}</p>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  children,
  dismissable = true,
  title,
  subtitle,
  footer,
  finePrint,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  dismissable?: boolean;
  /** judul header (mode terstruktur: header menempel, isi scroll) */
  title?: string;
  /** pelengkap di bawah judul, mis. chip fakta ujian */
  subtitle?: ReactNode;
  /** tombol aksi terkunci di dasar modal, tidak ikut scroll */
  footer?: ReactNode;
  /** catatan kecil di bawah footer */
  finePrint?: ReactNode;
}) {
  if (!open) return null;

  const closeBtn = dismissable ? (
    <button
      type="button"
      onClick={onClose}
      aria-label="Tutup"
      className={press + " focus-ring -m-2 rounded-full p-2 text-ink-48 hover:text-ink"}
    >
      <X className="size-5" />
    </button>
  ) : null;

  /* Mode legacy untuk pemakai lama tanpa slot header/footer. */
  if (title == null && footer == null) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/60 p-4">
        <Card
          role="dialog"
          aria-modal="true"
          className="max-h-[85dvh] w-full max-w-lg overflow-y-auto p-6 sm:p-8"
        >
          {closeBtn && <div className="flex justify-end">{closeBtn}</div>}
          {children}
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/60 p-4">
      <Card
        role="dialog"
        aria-modal="true"
        aria-label={title ?? undefined}
        className="flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden"
      >
        {title != null && (
          <div className="flex items-start justify-between gap-4 border-b border-hairline px-6 pb-5 pt-6 sm:px-8 sm:pt-8">
            <div>
              <h2 className="text-display-md text-ink">{title}</h2>
              {subtitle != null && <div className="mt-3">{subtitle}</div>}
            </div>
            {closeBtn}
          </div>
        )}
        <div className="min-h-0 grow overscroll-contain overflow-y-auto px-6 py-6 sm:px-8">
          {children}
        </div>
        {footer != null && (
          <div className="border-t border-hairline px-6 pb-6 pt-5 sm:px-8">
            {footer}
            {finePrint != null && (
              <p className="text-micro mt-4 flex items-center gap-1.5 text-ink-48">
                {finePrint}
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

/** Bar penguasaan indikator: track hairline tipis, isi warna status. */
export function IndicatorBar({ item }: { item: IndicatorSummary }) {
  const pct = Math.round(item.percentage);
  const fill = MASTERY_COLOR[masteryOf(item.percentage)];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-body-strong text-ink">{item.indicator}</span>
        <span className="text-caption text-ink-48 tabular-nums">
          {pct}% ({item.correct}/{item.total})
        </span>
      </div>
      <div
        className="bar-track overflow-hidden rounded-pill"
        role="img"
        aria-label={`${item.indicator}: ${pct}%`}
      >
        <div
          className="bar-fill transition-[width] duration-700"
          style={{ width: `${pct}%`, background: fill }}
        />
      </div>
    </div>
  );
}

/** Chip indikator kecil (tagline soal di kuis). */
export function PearlChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-chip bg-pearl px-3.5 py-2 text-caption text-ink-80">
      {children}
    </span>
  );
}

/** Saya butuh format skor yang aman tampil: 87,5 / 100. */
export function ScoreText({ value }: { value: number }) {
  return <span>{formatScore(value)}</span>;
}

/* ============================================================
   Homepage — util tampilan
   ============================================================ */

function prefersReducedMotion(): boolean {
  if (typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Pembungkus scroll-reveal: fade + naik 12px sekali saat masuk viewport.
    Hormati prefers-reduced-motion dan fallback bila IO tak tersedia. */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  /** Tunda kemunculan (ms) untuk efek stagger. */
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);
  const [reduced] = useState(prefersReducedMotion);

  useEffect(() => {
    if (reduced || shown) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    const el = ref.current;
    if (el) io.observe(el);
    return () => io.disconnect();
  }, [reduced, shown]);

  const settled = shown || reduced;
  return (
    <div
      ref={ref}
      className={
        (settled ? "opacity-100 translate-y-0 " : "opacity-0 translate-y-3 ") +
        "transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] " +
        className
      }
      style={delay > 0 ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/* Kartu mock hasil ujian: citra produk homepage. Angka mock koheren
   (15 benar dari 20 soal = nilai 75) dengan satu indikator warn. */
const MOCK_INDICATORS: IndicatorSummary[] = [
  { indicator: "Membandingkan Pecahan", total: 7, correct: 6, percentage: 85.7 },
  { indicator: "Operasi Hitung Pecahan", total: 6, correct: 5, percentage: 83.3 },
  { indicator: "Pecahan Senilai", total: 7, correct: 4, percentage: 57.1 },
];

export function ScoreMockCard({ className = "" }: { className?: string }) {
  return (
    <Card className={"product-shadow w-full max-w-sm p-7 text-left " + className}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-caption text-ink-48">Hasil Ujian</p>
          <p className="text-hero-display mt-1 text-ink tabular-nums">75</p>
          <p className="text-caption mt-1 text-ink-48">
            Nilai skala 100 dari 20 soal
          </p>
        </div>
        <span className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-ok/15 px-3 py-1.5 text-caption-strong text-ok">
          <Check className="size-4" />
          SELESAI
        </span>
      </div>
      <div className="mt-6 flex flex-col gap-4 border-t border-hairline pt-6">
        {MOCK_INDICATORS.map((item) => (
          <IndicatorBar key={item.indicator} item={item} />
        ))}
      </div>
    </Card>
  );
}
