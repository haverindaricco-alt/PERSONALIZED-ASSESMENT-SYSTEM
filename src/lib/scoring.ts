import type {
  AnswerMap,
  AnswerLetter,
  IndicatorSummary,
  QuestionRow,
} from "../types";
import { ANSWER_LETTERS } from "../types";

/** Pengacakan Fisher-Yates (tidak memutasi array sumber). */
export function fisherYates<T>(source: T[]): T[] {
  const arr = [...source];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function optionText(question: QuestionRow, letter: AnswerLetter): string {
  const key = `option_${letter.toLowerCase()}` as keyof QuestionRow;
  return String(question[key]);
}

export interface ScoreSummary {
  score: number;
  correctCount: number;
  wrongCount: number;
  totalQuestions: number;
  indicators: IndicatorSummary[];
}

/**
 * Hitung skor (skala 0-100), jumlah benar/salah, dan peta penguasaan
 * per indikator. Soal tidak dijawab dihitung salah.
 */
export function summarizeAnswers(
  questions: QuestionRow[],
  answers: AnswerMap,
): ScoreSummary {
  let correctCount = 0;
  const indicatorMap = new Map<string, IndicatorSummary>();

  for (const q of questions) {
    const isCorrect = answers[q.id] === q.correct_answer;
    if (isCorrect) correctCount += 1;

    const entry = indicatorMap.get(q.indicator) ?? {
      indicator: q.indicator,
      total: 0,
      correct: 0,
      percentage: 0,
    };
    entry.total += 1;
    if (isCorrect) entry.correct += 1;
    entry.percentage = entry.total > 0
      ? (entry.correct / entry.total) * 100
      : 0;
    indicatorMap.set(q.indicator, entry);
  }

  const totalQuestions = questions.length;
  const wrongCount = totalQuestions - correctCount;
  const score =
    totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * 100 * 100) / 100
      : 0;

  return {
    score,
    correctCount,
    wrongCount,
    totalQuestions,
    indicators: [...indicatorMap.values()],
  };
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

export { ANSWER_LETTERS };
