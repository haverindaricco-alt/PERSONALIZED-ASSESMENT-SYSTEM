import type { AnswerMap, QuizSession } from "../types";

/* ============================================================
   Resiliensi data: backup localStorage.
   Jawaban siswa tetap aman saat halaman ter-refresh.
   ============================================================ */

const SESSION_KEY = "pas.session.v1";
const ANSWERS_KEY = "pas.answers.v1";

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* penyimpanan penuh atau diblokir: abaikan */
  }
}

/** Proyeksi soal ke kolom aman saja. Sesi dari aplikasi versi lama bisa
    membawa `correct_answer` di localStorage — dibuang di sini (SEC-06)
    sehingga bank di penyimpanan tidak pernah memegang kunci jawaban. */
function sanitizeQuestions(list: unknown[]): QuizSession["questions"] {
  return list
    .filter((q): q is Record<string, unknown> => !!q && typeof q === "object")
    .map((q) => ({
      id: String(q.id ?? ""),
      question_number: Number(q.question_number ?? 0),
      question_text: String(q.question_text ?? ""),
      option_a: String(q.option_a ?? ""),
      option_b: String(q.option_b ?? ""),
      option_c: String(q.option_c ?? ""),
      option_d: String(q.option_d ?? ""),
      option_e: String(q.option_e ?? ""),
      indicator: String(q.indicator ?? ""),
    }))
    .filter((q) => q.id && q.question_text);
}

export function saveSession(session: QuizSession): void {
  write(SESSION_KEY, {
    ...session,
    questions: sanitizeQuestions(session.questions),
  });
}

export function loadSession(): QuizSession | null {
  const s = read<QuizSession>(SESSION_KEY);
  if (!s) return null;
  if (
    typeof s.deadlineMs !== "number" ||
    !Array.isArray(s.questions) ||
    s.questions.length === 0
  ) {
    return null;
  }
  return { ...s, questions: sanitizeQuestions(s.questions) };
}

export function saveAnswers(answers: AnswerMap): void {
  write(ANSWERS_KEY, answers);
}

export function loadAnswers(): AnswerMap {
  return read<AnswerMap>(ANSWERS_KEY) ?? {};
}

export function clearQuizBackup(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(ANSWERS_KEY);
  } catch {
    /* abaikan */
  }
}
