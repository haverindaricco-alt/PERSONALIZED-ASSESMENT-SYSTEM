/** Pengacakan Fisher-Yates (tidak memutasi array sumber). */
export function fisherYates<T>(source: T[]): T[] {
  const arr = [...source];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export type Mastery = "green" | "yellow" | "red";

/** Hijau >= 75%, Kuning 50-74%, Merah < 50%. */
export function masteryOf(percentage: number): Mastery {
  if (percentage >= 75) return "green";
  if (percentage >= 50) return "yellow";
  return "red";
}

export const MASTERY_COLOR: Record<Mastery, string> = {
  green: "var(--color-ok)",
  yellow: "var(--color-warn)",
  red: "var(--color-bad)",
};

/** Sisa waktu dalam format HH:MM:SS. */
export function formatHMS(totalMs: number): string {
  const clamped = Math.max(0, Math.floor(totalMs / 1000));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function formatIdDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatScore(n: number): string {
  return n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}
