import { createClient } from "@supabase/supabase-js";
import type {
  AnswerMap,
  QuestionRow,
  ResultRow,
  SettingsRow,
  StudentQuestion,
} from "../types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_ANON_KEY || "placeholder",
);

const isPlaceholder = (v: string) =>
  !v || v.startsWith("YOUR_") || v.includes("placeholder");

export function ensureSupabaseConfigured(): void {
  if (isPlaceholder(SUPABASE_URL) || isPlaceholder(SUPABASE_ANON_KEY)) {
    throw new Error(
      "Konfigurasi Supabase belum diisi. Lengkapi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env, lalu jalankan supabase/security-patch.sql di SQL Editor Supabase.",
    );
  }
}

/** Konversi error DB ke pesan Indonesia yang aman:
    pesan domain kita diteruskan apa adanya, sisanya digenerik
    agar detail skema tidak bocor (SEC-08). */
function friendlyDbError(err: unknown): Error {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  if (
    raw.includes("uuid") ||
    raw.toLowerCase().includes("invalid input syntax")
  ) {
    return new Error("Tautan hasil ujian tidak valid.");
  }
  if (
    raw.includes("Token") ||
    raw.includes("Nama") ||
    raw.includes("status") ||
    raw.includes("Bank") ||
    raw.includes("Hasil") ||
    raw.includes("Rekomendasi")
  ) {
    return new Error(raw);
  }
  return new Error("Terjadi kesalahan pada server. Coba lagi.");
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "Terjadi kesalahan tak terduga. Coba lagi.";
}

async function rows<T>(
  builder: PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<T[]> {
  ensureSupabaseConfigured();
  const { data, error } = (await builder) as {
    data: T[] | null;
    error: { message: string } | null;
  };
  if (error) throw friendlyDbError(error);
  return (data ?? []) as T[];
}

/* ---------- Settings ---------- */

export async function fetchFirstSettings(): Promise<SettingsRow | null> {
  const list = await rows<SettingsRow>(
    supabase.from("settings").select("*").limit(1),
  );
  return list[0] ?? null;
}

export interface SettingsPatch {
  token?: string;
  status?: "AKTIF" | "TIDAK_AKTIF";
  duration_minutes?: number;
}

export async function updateSettings(
  id: string,
  patch: SettingsPatch,
): Promise<void> {
  await rows<SettingsRow>(
    supabase.from("settings").update(patch).eq("id", id).select(),
  );
}

/** Validasi token ujian dari sisi siswa (hanya kolom yang aman). */
export async function fetchSettingsByToken(
  token: string,
): Promise<SettingsRow> {
  const list = await rows<SettingsRow>(
    supabase
      .from("settings")
      .select("id, token, status, duration_minutes")
      .ilike("token", token.trim())
      .limit(1),
  );
  if (!list[0]) {
    throw new Error("Token tidak ditemukan atau ujian tidak aktif.");
  }
  return list[0];
}

/* ---------- Questions ---------- */

/** Soal untuk siswa: dari view tanpa kolom kunci jawaban (SEC-06). */
export async function fetchStudentQuestions(): Promise<StudentQuestion[]> {
  const list = await rows<StudentQuestion>(
    supabase
      .from("questions_public")
      .select("*")
      .order("question_number", { ascending: true }),
  );
  return list;
}

/** Peta id soal (tanpa kunci) untuk mericip hasil ujian di halaman Result. */
export async function fetchStudentQuestionMap(): Promise<
  Map<string, StudentQuestion>
> {
  const list = await fetchStudentQuestions();
  return new Map(list.map((q) => [q.id, q]));
}

/** Soal lengkap: hanya untuk admin yang sudah login (authenticated). */
export async function fetchQuestionsAdmin(): Promise<QuestionRow[]> {
  const list = await rows<QuestionRow>(
    supabase
      .from("questions")
      .select("*")
      .order("question_number", { ascending: true }),
  );
  return list;
}

export type QuestionInput = Omit<QuestionRow, "id" | "created_at">;

export async function insertQuestion(input: QuestionInput): Promise<void> {
  await rows<QuestionRow>(
    supabase.from("questions").insert(input).select(),
  );
}

export async function updateQuestion(
  id: string,
  input: QuestionInput,
): Promise<void> {
  await rows<QuestionRow>(
    supabase.from("questions").update(input).eq("id", id).select(),
  );
}

export async function deleteQuestion(id: string): Promise<void> {
  await rows<QuestionRow>(
    supabase.from("questions").delete().eq("id", id).select(),
  );
}

/* ---------- Results (grading & akses via RPC server-side) ---------- */

export interface GradeInput {
  token: string;
  student: string;
  answers: AnswerMap;
  status: string;
}

/** Kirim jawaban ke server; skor & peta indikator dihitung di database,
    kunci jawaban tidak pernah dikirim ke browser (SEC-06, RACE-01). */
export async function gradeAndSave(input: GradeInput): Promise<ResultRow> {
  ensureSupabaseConfigured();
  const { data, error } = await supabase.rpc("grade_and_save", {
    p_token: input.token,
    p_student: input.student,
    p_answers: input.answers,
    p_status: input.status,
  });
  if (error) throw friendlyDbError(error);
  if (!data) throw new Error("Terjadi kesalahan pada server. Coba lagi.");
  return data as ResultRow;
}

/** Tempel rekomendasi AI ke hasil; hanya lewat token yang cocok. */
export async function attachRecommendation(
  id: string,
  token: string,
  text: string,
): Promise<void> {
  ensureSupabaseConfigured();
  const { error } = await supabase.rpc("attach_recommendation", {
    p_id: id,
    p_token: token,
    p_text: text,
  });
  if (error) throw friendlyDbError(error);
}

/** Hasil milik siswa: hanya dengan id + token ujian yang cocok. */
export async function getResultForStudent(
  id: string,
  token: string,
): Promise<ResultRow> {
  ensureSupabaseConfigured();
  const { data, error } = await supabase.rpc("get_result_for_student", {
    p_id: id,
    p_token: token,
  });
  if (error) throw friendlyDbError(error);
  if (!data) throw new Error("Hasil tidak ditemukan. Periksa tautan/token.");
  return data as ResultRow;
}

/** Untuk recap admin; RLS mensyaratkan session authenticated. */
export async function fetchResults(): Promise<ResultRow[]> {
  return rows<ResultRow>(
    supabase
      .from("results")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
  );
}
