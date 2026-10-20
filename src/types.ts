export type AnswerLetter = "A" | "B" | "C" | "D" | "E";

export const ANSWER_LETTERS: AnswerLetter[] = ["A", "B", "C", "D", "E"];

export interface QuestionRow {
  id: string;
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  correct_answer: AnswerLetter;
  indicator: string;
  created_at?: string;
}

export interface SettingsRow {
  id: string;
  token: string;
  status: "AKTIF" | "TIDAK_AKTIF";
  duration_minutes: number;
  admin_pin: string;
  created_at?: string;
}

/** Ringkasan penguasaan satu indikator materi. */
export interface IndicatorSummary {
  indicator: string;
  total: number;
  correct: number;
  percentage: number;
}

/** Jawaban siswa berdasarkan id soal. */
export type AnswerMap = Record<string, AnswerLetter>;

export interface ResultRow {
  id: string;
  student_name: string;
  token_used: string;
  score: number;
  correct_count: number;
  wrong_count: number;
  total_questions: number;
  completion_status: string;
  answers_json: AnswerMap | null;
  indicator_summary_json: IndicatorSummary[] | null;
  ai_recommendation: string | null;
  created_at: string;
}

/** Snapshot sesi ujian yang dipersist ke localStorage. */
export interface QuizSession {
  studentName: string;
  token: string;
  durationMinutes: number;
  deadlineMs: number;
  /** Urutan soal sudah ter-cocok (Fisher-Yates) saat mulai. */
  questions: QuestionRow[];
}

export type CompletionKind = "done" | "timeout" | "violation";

export const STATUS_DONE = "SELESAI";
export const STATUS_TIMEOUT = "DIHENTIKAN - Waktu Habis";
export const STATUS_VIOLATION = "DIHENTIKAN - Pelanggaran Fokus Halaman";

export function classifyCompletion(status: string): CompletionKind {
  if (status.includes("Pelanggaran Fokus")) return "violation";
  if (status.includes("Waktu Habis")) return "timeout";
  return "done";
}
