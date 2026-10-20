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

export function saveSession(session: QuizSession): void {
  write(SESSION_KEY, session);
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
  return s;
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
