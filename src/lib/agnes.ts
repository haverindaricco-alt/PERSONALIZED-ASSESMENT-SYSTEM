import type { IndicatorSummary } from "../types";

/* ============================================================
   Agnes AI via Cloudflare Pages Function (/api/agnes-proxy).
   Produksi: kunci ADA DI SERVER (AGNES_API_KEY env Cloudflare),
   tidak pernah masuk bundle browser (SEC-05).
   Dev: bila belum ada proxy lokal, boleh memanggil langsung
   memakai VITE_AGNES_API_KEY (hanya diekseskusi saat mode dev).
   ============================================================ */

const PROXY_URL = "/api/agnes-proxy";
const TIMEOUT_MS = 15_000;
const DEFAULT_BASE = "https://apihub.agnes-ai.com/v1";
const DEFAULT_MODEL = "agnes-2.5-flash";

const DEV_KEY = import.meta.env.DEV
  ? import.meta.env.VITE_AGNES_API_KEY || ""
  : "";
const DEV_BASE = import.meta.env.DEV
  ? import.meta.env.VITE_AGNES_BASE_URL || DEFAULT_BASE
  : DEFAULT_BASE;
const DEV_MODEL = import.meta.env.DEV
  ? import.meta.env.VITE_AGNES_MODEL || DEFAULT_MODEL
  : DEFAULT_MODEL;

const SYSTEM_PROMPT = `Kamu adalah guru pembina berbahasa Indonesia yang menulis rekomendasi belajar personal berdasarkan hasil ujian pilihan ganda materi pecahan.

Keluaranmu wajib berupa tepat lima baris berlabel, tanpa baris lain:
Kekuatan: <1 sampai 2 kalimat apresiasi yang menyebut indikator dengan penguasaan tertinggi beserta persentasenya>
Fokus: <satu kalimat yang menyebut 1 sampai 2 indikator dengan penguasaan terendah>
Langkah 1: <satu kalimat aksi konkret yang menyebut indikator terlemah>
Langkah 2: <satu kalimat aksi konkret>
Langkah 3: <satu kalimat aksi konkret yang mengajak mengukur ulang kemajuan>

Aturan mutlak:
1. Tulis label "Kekuatan", "Fokus", "Langkah 1", "Langkah 2", "Langkah 3" diikuti titik dua, persis seperti itu, satu label per baris.
2. Isi tiap baris maksimal 25 kata, dengan sapaan "kamu" yang hangat dan membangun.
3. Kutip nama indikator persis seperti pada data, jangan mengganti atau meringkas istilahnya.
4. Dilarang menambah judul, pembuka seperti "Berikut rekomendasi", penutup, markdown, teks tebal, daftar berbutir lain, atau tanda hubung panjang.`;

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

/* ---------- Menyusun data input ---------- */

/** Indikator diurutkan tertinggi ke terendah agar "terkuat/terlemah" tidak ambigu. */
function sortedIndicators(indicators: IndicatorSummary[]): IndicatorSummary[] {
  return [...indicators].sort((a, b) => b.percentage - a.percentage);
}

function indicatorLines(indicators: IndicatorSummary[]): string {
  if (indicators.length === 0) return "Umum: tidak ada data indikator.";
  return sortedIndicators(indicators)
    .map(
      (i) =>
        `${i.indicator}: ${Math.round(i.percentage)}% (${i.correct}/${i.total})`,
    )
    .join("; ");
}

/** Nama 1-2 indikator terlemah sebagai fokus perbaikan. */
function weakIndicatorNames(indicators: IndicatorSummary[]): string {
  const sorted = sortedIndicators(indicators);
  if (sorted.length === 0) return "materi pecahan";
  return (
    sorted
      .filter((i) => i.percentage < 75)
      .map((i) => i.indicator)
      .slice(0, 2)
      .join(" dan ") || sorted[sorted.length - 1].indicator
  );
}

/* ---------- Fallback (struktur kanonik) ---------- */

function fallbackStrength(input: RecommendationInput): string {
  const sorted = sortedIndicators(input.indicators);
  const fmtScore = input.score.toLocaleString("id-ID", {
    maximumFractionDigits: 1,
  });
  const strongestPhrase = sorted[0]
    ? `${sorted[0].indicator} (${Math.round(sorted[0].percentage)}%)`
    : "seluruh materi";
  return `Selamat, ${input.studentName}! Kamu telah menyelesaikan ujian dengan nilai ${fmtScore} dari ${input.totalQuestions} soal. Penguasaan terbaikmu ada pada ${strongestPhrase}, pertahankan kebiasaan telitimu.`;
}

function fallbackFocus(input: RecommendationInput): string {
  return `Perdalam pemahamanmu pada ${weakIndicatorNames(
    input.indicators,
  )} agar penguasaanmu antarindikator lebih merata.`;
}

function fallbackSteps(input: RecommendationInput): string[] {
  const focus = weakIndicatorNames(input.indicators);
  return [
    `Pelajari ulang konsep dasar ${focus} melalui buku pelajarmu atau video pembelajaran, khususnya langkah menyamakan penyebut.`,
    `Kerjakan minimal lima soal latihan ${focus} setiap hari dan periksa ulang langkah perhitunganmu pada bagian yang keliru.`,
    `Tanyakan bagian yang masih membingungkan kepada gurumu, lalu ulangi ujian serupa untuk mengukur kemajuanmu dalam belajarmu.`,
  ];
}

function buildFallback(input: RecommendationInput): string {
  const steps = fallbackSteps(input);
  return [
    `Kekuatan: ${fallbackStrength(input)}`,
    `Fokus: ${fallbackFocus(input)}`,
    `Langkah 1: ${steps[0]}`,
    `Langkah 2: ${steps[1]}`,
    `Langkah 3: ${steps[2]}`,
  ].join("\n");
}

/* ---------- Normalisasi & validasi keluaran model ---------- */

type RecommendationParts = {
  strength: string;
  focus: string;
  steps: string[];
};

/** Baris berlabel: "Kekuatan:", "Fokus:", "Langkah 1:" dst. Longgar soal pemisah. */
const LABEL_RE = /^(kekuatan|apresiasi|fokus|langkah\s*([123])\b)\s*[:-]?\s*(.*)$/i;
/** Baris bernomor gaya lama: "1)", "2.", "3:" */
const STEP_RE = /^([123])\b\s*[).:]\s*(.+)$/;

/** Bersihkan artefak markdown dan rapikan whitespace. */
function sanitize(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/```[a-z]*\n?/gi, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^[ \t]*[-\u2022*]\s+/gm, "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[ \t]{2,}/g, " ");
}

/**
 * Petakan teks model ke struktur kanonik lima bagian.
 * Baris tanpa label yang tidak menyambung slot mana pun diabaikan
 * (umumnya basa-basi pembuka/penutup yang lolos dari prompt).
 */
function parseRecommendation(clean: string): RecommendationParts {
  const rec: RecommendationParts = { strength: "", focus: "", steps: ["", "", ""] };
  let pending: "strength" | "focus" | number | null = null;

  for (const line of clean.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    const labeled = LABEL_RE.exec(trimmed);
    if (labeled) {
      const key = labeled[1].toLowerCase().replace(/\s+/g, " ");
      const content = (labeled[3] ?? "").trim();
      if (key === "kekuatan" || key === "apresiasi") {
        rec.strength = content;
        pending = content ? null : "strength";
      } else if (key === "fokus") {
        rec.focus = content;
        pending = content ? null : "focus";
      } else {
        const idx = Math.min(2, Math.max(0, Number(labeled[2]) - 1));
        rec.steps[idx] = content;
        pending = content ? null : idx;
      }
      continue;
    }

    const stepped = STEP_RE.exec(trimmed);
    if (stepped) {
      rec.steps[Number(stepped[1]) - 1] = stepped[2].trim();
      pending = null;
      continue;
    }

    if (pending !== null) {
      if (pending === "strength") rec.strength = trimmed;
      else if (pending === "focus") rec.focus = trimmed;
      else rec.steps[pending] = trimmed;
      pending = null;
    }
  }
  return rec;
}

/**
 * Paksa keluaran model ke struktur lima baris berlabel.
 * Bagian yang hilang ditambal dari fallback; bila tak ada yang bisa
 * dipetakan sama sekali, seluruhnya diganti fallback.
 */
function normalizeOutput(raw: string, input: RecommendationInput): string {
  const parsed = parseRecommendation(sanitize(raw));
  const hasAny =
    parsed.strength.length > 0 ||
    parsed.focus.length > 0 ||
    parsed.steps.some((s) => s.length > 0);
  if (!hasAny) return buildFallback(input);

  const fallback = fallbackSteps(input);
  const steps = [0, 1, 2].map((i) => parsed.steps[i] || fallback[i]);
  return [
    `Kekuatan: ${parsed.strength || fallbackStrength(input)}`,
    `Fokus: ${parsed.focus || fallbackFocus(input)}`,
    `Langkah 1: ${steps[0]}`,
    `Langkah 2: ${steps[1]}`,
    `Langkah 3: ${steps[2]}`,
  ].join("\n");
}

/* ---------- Pemanggilan API ---------- */

async function chatViaProxy(
  userContent: string,
  signal: AbortSignal,
): Promise<string> {
  const res = await fetch(PROXY_URL, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Proxy merespons ${res.status}`);
  const data = (await res.json()) as { content?: string };
  return (data.content || "").trim();
}

/** Hanya dipakai di mode dev bila proxy belum berjalan. */
async function chatViaDevDirect(
  userContent: string,
  signal: AbortSignal,
): Promise<string> {
  const res = await fetch(`${DEV_BASE}/chat/completions`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEV_KEY}`,
    },
    body: JSON.stringify({
      model: DEV_MODEL,
      temperature: 0.3,
      max_tokens: 350,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Agnes API merespons ${res.status}`);
  const data = (await res.json()) as ChatResponse;
  return (data.choices?.[0]?.message?.content || "").trim();
}

/** Minta rekomendasi belajar. Selalu terpenuhi (punya fallback). */
export async function recommendLearning(
  input: RecommendationInput,
): Promise<string> {
  const userContent = [
    `Nama siswa: ${input.studentName}`,
    `Nilai akhir: ${input.score.toLocaleString("id-ID", { maximumFractionDigits: 2 })} dari skala 100`,
    `Jawaban benar: ${input.correctCount}, salah: ${input.wrongCount}, total soal: ${input.totalQuestions}`,
    `Peta penguasaan indikator: ${indicatorLines(input.indicators)}`,
  ].join("\n");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    let text = "";
    try {
      text = await chatViaProxy(userContent, ctrl.signal);
    } catch (err) {
      /* Dev tolak: proxy belum jalan → coba jalur langsung (kunci dev saja). */
      if (!import.meta.env.DEV || !DEV_KEY) throw err;
      text = await chatViaDevDirect(userContent, ctrl.signal);
    }
    if (text.length > 0) return normalizeOutput(text, input);
    return buildFallback(input);
  } catch {
    return buildFallback(input);
  } finally {
    clearTimeout(timer);
  }
}
