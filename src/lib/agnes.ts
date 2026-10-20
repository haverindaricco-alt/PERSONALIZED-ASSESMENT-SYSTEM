import type { IndicatorSummary } from "../types";

/* ============================================================
   Agnes AI (OpenAI-compatible chat completions)
   Base: https://apihub.agnes-ai.com/v1  Model: agnes-2.5-flash
   Dipanggil langsung lewat fetch, tanpa SDK tambahan.
   ============================================================ */

const BASE_URL = (
  import.meta.env.VITE_AGNES_BASE_URL || "https://apihub.agnes-ai.com/v1"
).replace(/\/+$/, "");
const MODEL = import.meta.env.VITE_AGNES_MODEL || "agnes-2.5-flash";
const API_KEY = import.meta.env.VITE_AGNES_API_KEY || "";
const TIMEOUT_MS = 15_000;

const SYSTEM_PROMPT = `Kamu adalah guru pembina berbahasa Indonesia yang menulis rekomendasi belajar personal berdasarkan hasil ujian pilihan ganda materi pecahan.
Aturan keluaran:
1. Paragraf pertama: apresiasi 2 sampai 3 kalimat yang menyebut kekuatan siswa, rujuk indikator dengan penguasaan tertinggi secara kanonik.
2. Lanjutkan dengan tepat tiga langkah perbaikan bernomor "1)", "2)", "3)". Setiap langkah satu kalimat konkret yang merujuk indikator dengan penguasaan terendah.
3. Maksimal 120 kata. Tanpa heading markdown, tanpa tebal, tanpa tanda hubung panjang, tanpa basa-basi pembuka seperti "Berikut rekomendasi".`;

export interface RecommendationInput {
  studentName: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  totalQuestions: number;
  indicators: IndicatorSummary[];
}

interface ChatChoice {
  message?: { content?: string };
}

interface ChatResponse {
  choices?: ChatChoice[];
}

function indicatorLines(indicators: IndicatorSummary[]): string {
  if (indicators.length === 0) return "Umum: tidak ada data indikator.";
  return indicators
    .map(
      (i) =>
        `${i.indicator}: ${Math.round(i.percentage)}% (${i.correct}/${i.total})`,
    )
    .join("; ");
}

function buildFallback(input: RecommendationInput): string {
  const sorted = [...input.indicators].sort(
    (a, b) => b.percentage - a.percentage,
  );
  const strongest = sorted[0]?.indicator ?? "seluruh materi";
  const focusList =
    sorted.length > 0
      ? sorted
          .filter((i) => i.percentage < 75)
          .map((i) => i.indicator)
          .slice(0, 2)
          .join(" dan ") || sorted[sorted.length - 1].indicator
      : "materi pecahan";
  const fmtScore = input.score.toLocaleString("id-ID", {
    maximumFractionDigits: 1,
  });
  return [
    `Selamat, ${input.studentName}! Kamu telah menyelesaikan ujian dengan nilai ${fmtScore} dari ${input.totalQuestions} soal. Penguasaan terbaikmu ada pada materi ${strongest}, pertahankan kebiasaan teliti ini.`,
    `1) Pelajari ulang konsep dasar ${focusList} melalui buku pelajarmu atau video pembelajaran, khususnya langkah menyamakan penyebut.`,
    `2) Kerjakan minimal lima soal latihan ${focusList} setiap hari dan periksa ulang langkah perhitunganmu pada bagian yang keliru.`,
    `3) Tanyakan bagian yang masih membingungkan kepada gurumu, lalu ulangi ujian serupa untuk mengukur kemajuanmu dalam belajarmu.`,
  ].join("\n");
}

/** Minta rekomendasi belajar. Selalu terpenuhi (punya fallback). */
export async function recommendLearning(
  input: RecommendationInput,
): Promise<string> {
  try {
    if (!API_KEY || API_KEY.startsWith("YOUR_")) {
      return buildFallback(input);
    }
    const userContent = [
      `Nama siswa: ${input.studentName}`,
      `Nilai akhir: ${input.score.toLocaleString("id-ID", { maximumFractionDigits: 2 })} dari skala 100`,
      `Jawaban benar: ${input.correctCount}, salah: ${input.wrongCount}, total soal: ${input.totalQuestions}`,
      `Peta penguasaan indikator: ${indicatorLines(input.indicators)}`,
    ].join("\n");

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.6,
          max_tokens: 400,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ],
        }),
      });
      if (!res.ok) throw new Error(`Agnes API merespons ${res.status}`);
      const data = (await res.json()) as ChatResponse;
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text && text.length > 0) return text;
      return buildFallback(input);
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return buildFallback(input);
  }
}
