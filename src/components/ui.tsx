import type { ButtonHTMLAttributes, ReactNode } from "react";
import { X } from "lucide-react";
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
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={"rounded-card border border-hairline bg-canvas " + className}>
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
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  dismissable?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/60 p-4">
      <Card className="max-h-[85dvh] w-full max-w-lg overflow-y-auto p-6 sm:p-8">
        {dismissable && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className={press + " focus-ring -m-2 rounded-full p-2 text-ink-48 hover:text-ink"}
            >
              <X className="size-5" />
            </button>
          </div>
        )}
        {children}
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
    <span className="inline-flex items-center rounded-chip bg-pearl px-3.5 py-2 text-caption text-ink-80">
      {children}
    </span>
  );
}

/** Saya butuh format skor yang aman tampil: 87,5 / 100. */
export function ScoreText({ value }: { value: number }) {
  return <span>{formatScore(value)}</span>;
}
