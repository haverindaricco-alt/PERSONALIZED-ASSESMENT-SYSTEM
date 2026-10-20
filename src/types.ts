export type AnswerLetter = "A" | "B" | "C" | "D" | "E";

export const ANSWER_LETTERS: AnswerLetter[] = ["A", "B", "C", "D", "E"];

/** Soal versi aman milik siswa: TANPA kunci jawaban.
    Dikirim dari view questions_public (security-patch.sql). */
export interface StudentQuestion {
  id: string;
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  indicator: string;
}

/** Soal lengkap milik admin (bisa tayang kunci jawaban). */
export interface QuestionRow extends StudentQuestion {
  correct_answer: AnswerLetter;
  created_at?: string;
}

export interface SettingsRow {
  id: string;
  token: string;
  status: "AKTIF" | "TIDAK_AKTIF";
  duration_minutes: number;
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
  /** Peta id soal -> benar/salah. Hasil grading dari server. */
  answers_correct_json: Record<string, boolean> | null;
  /** Peta id soal -> huruf kunci (hanya soal yang dijawab). */
  answers_key_json: Record<string, AnswerLetter> | null;
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
  /** Urutan soal sudah ter-acak (Fisher-Yates) saat mulai. */
  questions: StudentQuestion[];
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
