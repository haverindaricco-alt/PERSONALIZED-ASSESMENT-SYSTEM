import { createClient } from "@supabase/supabase-js";
import type {
  AnswerMap,
  IndicatorSummary,
  QuestionRow,
  ResultRow,
  SettingsRow,
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
      "Konfigurasi Supabase belum diisi. Lengkapi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env, lalu jalankan supabase/schema.sql di SQL Editor Supabase.",
    );
  }
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
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

/* ---------- Settings ---------- */

export async function fetchFirstSettings(): Promise<SettingsRow | null> {
  const list = await rows<SettingsRow>(
    supabase.from("settings").select("*").limit(1),
  );
  return list[0] ?? null;
}

export async function fetchSettingsByToken(token: string): Promise<SettingsRow> {
  const list = await rows<SettingsRow>(
    supabase.from("settings").select("*").ilike("token", token.trim()).limit(1),
  );
  if (list.length === 0) {
    throw new Error("Token tidak ditemukan. Periksa kembali token ujian Anda.");
  }
  return list[0];
}

export interface SettingsPatch {
  token?: string;
  status?: "AKTIF" | "TIDAK_AKTIF";
  duration_minutes?: number;
  admin_pin?: string;
}

export async function updateSettings(
  id: string,
  patch: SettingsPatch,
): Promise<SettingsRow> {
  const list = await rows<SettingsRow>(
    supabase
      .from("settings")
      .update(patch)
      .eq("id", id)
      .select(),
  );
  if (list.length === 0) throw new Error("Gagal menyimpan pengaturan.");
  return list[0];
}

/* ---------- Questions ---------- */

export async function fetchQuestions(): Promise<QuestionRow[]> {
  const list = await rows<QuestionRow>(
    supabase
      .from("questions")
      .select("*")
      .order("question_number", { ascending: true }),
  );
  return list;
}

/** Peta id soal ke baris soal, untuk mericip hasil ujian. */
export async function fetchQuestionMap(): Promise<Map<string, QuestionRow>> {
  const list = await fetchQuestions();
  return new Map(list.map((q) => [q.id, q]));
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

/* ---------- Results ---------- */

export interface ResultPayload {
  student_name: string;
  token_used: string;
  score: number;
  correct_count: number;
  wrong_count: number;
  total_questions: number;
  completion_status: string;
  answers_json: AnswerMap;
  indicator_summary_json: IndicatorSummary[];
  ai_recommendation: string;
}

export async function insertResult(payload: ResultPayload): Promise<string> {
  const list = await rows<ResultRow>(
    supabase.from("results").insert(payload).select(),
  );
  if (list.length === 0) throw new Error("Gagal menyimpan hasil ujian.");
  return list[0].id;
}

export async function fetchResultById(id: string): Promise<ResultRow | null> {
  const list = await rows<ResultRow>(
    supabase.from("results").select("*").eq("id", id).limit(1),
  );
  return list[0] ?? null;
}

export async function fetchResults(): Promise<ResultRow[]> {
  return rows<ResultRow>(
    supabase
      .from("results")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
  );
}
