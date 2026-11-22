import type { IndicatorSummary } from "../types";

/* ============================================================
   Agnes AI via Cloudflare Pages Function (/api/agnes-proxy).
   Produksi: kunci ADA DI SERVER (AGNES_API_KEY env Cloudflare),
   tidak pernah masuk bundle browser (SEC-05).
   Dev: bila belum ada proxy lokal, boleh memanggil langsung
   memakai VITE_AGNES_API_KEY (hanya dieksekusi saat mode dev).
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

/* ============================================================
   SYSTEM PROMPT DENGAN GROUND-TRUTH & ANTI-HALUSINASI KETAT
   ============================================================ */
const SYSTEM_PROMPT = `Kamu adalah guru berbahasa Indonesia yang menulis rekomendasi belajar personal berdasarkan data hasil asesmen berupa soal isian.

Pedoman Anti-Halusinasi (Wajib Dipatuhi Secara Mutlak):
1. HANYA gunakan nama indikator yang secara eksplisit tertulis pada data ujian siswa di bawah. Dilarang mengarang, menyingkat, atau memodifikasi istilah indikator.
2. Dilarang mengarang angka persentase, jumlah benar, atau skor yang berbeda dari data siswa yang diberikan.
3. Bagian "Kekuatan" WAJIB merujuk pada indikator dengan persentase tertinggi siswa.
4. Bagian "Fokus" dan "Langkah" WAJIB berfokus pada 1-2 indikator dengan persentase terendah (indikator yang belum tuntas).
5. Dilarang menulis pengantar ("Berikut rekomendasi:"), penutup, disclaimer AI, markdown tebal, daftar bullet point, atau menyebut diri sebagai AI/model bahasa.

Keluaranmu wajib berupa tepat lima baris berlabel, tanpa baris lain:
Kekuatan: <1 sampai 2 kalimat apresiasi yang menyebut indikator dengan penguasaan tertinggi beserta persentasenya>
Fokus: <satu kalimat yang menyebut 1 sampai 2 indikator dengan penguasaan terendah>
Langkah 1: <satu kalimat aksi konkret yang menyebut indikator terlemah>
Langkah 2: <satu kalimat aksi konkret latihan mandiri>
Langkah 3: <satu kalimat aksi konkret yang mengajak mengukur ulang kemajuan>

Aturan mutlak:
1. Tulis label "Kekuatan", "Fokus", "Langkah 1", "Langkah 2", "Langkah 3" diikuti titik dua, persis seperti itu, satu label per baris.
2. Isi tiap baris maksimal 25 kata, dengan sapaan "kamu" yang hangat, edukatif, dan membangun.
3. Kutip nama indikator persis seperti pada data, jangan mengganti atau meringkas istilahnya.`;

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

/* ---------- Menyusun data input ground-truth ---------- */

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
  if (sorted.length === 0) return "materi yang diujikan";
  return (
    sorted
      .filter((i) => i.percentage < 75)
      .map((i) => i.indicator)
      .slice(0, 2)
      .join(" dan ") || sorted[sorted.length - 1].indicator
  );
}

/* ---------- Fallback Deterministik (Terjamin Benar & Konsisten) ---------- */

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
    `Pelajari ulang konsep dasar ${focus} melalui buku pelajarmu atau video pembelajaran, khususnya langkah perhitungannya.`,
    `Kerjakan minimal lima soal latihan ${focus} setiap hari dan periksa ulang langkah perhitunganmu pada bagian yang keliru.`,
    `Tanyakan bagian yang masih membingungkan kepada gurumu, lalu ulangi ujian serupa untuk mengukur kemajuan belajarmu.`,
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

/* ============================================================
   ANTI-HALUSINASI & SANITASI KELUARAN AI
   ============================================================ */

type RecommendationParts = {
  strength: string;
  focus: string;
  steps: string[];
};

/** Baris berlabel: "Kekuatan:", "Fokus:", "Langkah 1:" dst. */
const LABEL_RE = /^(kekuatan|apresiasi|fokus|langkah\s*([123])\b)\s*[:-]?\s*(.*)$/i;
const STEP_RE = /^([123])\b\s*[).:]\s*(.+)$/;

/** Kata/frasa meta AI yang dilarang keras muncul dalam rekomendasi siswa. */
const FORBIDDEN_META_RE =
  /\b(sebagai\s+ai|model\s+bahasa|agnes\s+ai|chatgpt|openai|large\s+language\s+model|as\s+an\s+ai|language\s+model|maaf,\s*saya|saya\s+tidak\s+bisa|saya\s+adalah\s+(sebuah\s+)?(ai|model)|berikut\s+(adalah\s+)?(rekomendasi|analisis|hasil)|disclaimer|catatan\s*:)\b/i;

/** Topik matematika di luar materi yang sering dihalusinasikan AI. */
const FOREIGN_TOPIC_RE =
  /\b(aljabar|trigonometri|kalkulus|integral|turunan|matriks|vektor|logaritma|peluang|statistika|persamaan\s+kuadrat|geometri\s+ruang|teorema\s+pythagoras)\b/i;

/** Bersihkan artefak markdown, tag HTML, emoji, dan spasi ganda. */
function sanitize(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/```[a-z]*\n?/gi, "")
    .replace(/<\/?[a-z][a-z0-9]*[^<>]*>/gi, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^[ \t]*[-\u2022*]\s+/gm, "")
    .replace(/[`_]/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[ \t]{2,}/g, " ");
}

/** Cek apakah teks memuat topik asing di luar indikator yang diujikan. */
function hasForeignTopic(text: string, indicators: IndicatorSummary[]): boolean {
  const indicatorNames = indicators.map((i) => i.indicator.toLowerCase()).join(" ");
  if (!FOREIGN_TOPIC_RE.test(indicatorNames) && FOREIGN_TOPIC_RE.test(text)) {
    return true;
  }
  return false;
}

/** Cari indikator terdaftar mana saja yang disebut dalam teks. */
function getMentionedIndicators(
  text: string,
  indicators: IndicatorSummary[],
): IndicatorSummary[] {
  const lower = text.toLowerCase();
  return indicators.filter((ind) =>
    lower.includes(ind.indicator.trim().toLowerCase()),
  );
}

/**
 * Validasi dan perbaiki angka persentase hasil halusinasi.
 * Jika model mengarang angka persentase yang tidak relevan dengan data riil,
 * angka tersebut dikoreksi ke persentase indikator tertinggi terdekat.
 */
function correctHallucinatedPercentages(
  text: string,
  input: RecommendationInput,
): string {
  const sorted = sortedIndicators(input.indicators);
  const validPcts = [
    Math.round(input.score),
    ...input.indicators.map((i) => Math.round(i.percentage)),
  ];

  return text.replace(/(\d{1,3})\s*%/g, (match, numStr) => {
    const num = Number(numStr);
    // Jika persentase cocok dengan salah satu data riil (toleransi ±3%), pertahankan
    const isClose = validPcts.some((p) => Math.abs(p - num) <= 3);
    if (isClose) return match;

    // Bila halusinasi (misal ngarang 100% padahal data tertinggi hanya 80%),
    // ganti dengan persentase riil indikator terkuat
    const topPct = sorted[0]
      ? Math.round(sorted[0].percentage)
      : Math.round(input.score);
    return `${topPct}%`;
  });
}

/**
 * Validasi baris Kekuatan:
 * Mencegah inversi logika (memuji indikator terlemah), memblokir topik asing & meta AI.
 */
function validateAndSanitizeStrength(
  rawText: string,
  input: RecommendationInput,
): string {
  let text = rawText.replace(/^kekuatan\s*[:-]?\s*/i, "").trim();
  if (text.length < 15) return fallbackStrength(input);
  if (FORBIDDEN_META_RE.test(text)) return fallbackStrength(input);
  if (hasForeignTopic(text, input.indicators)) return fallbackStrength(input);

  const sorted = sortedIndicators(input.indicators);
  if (sorted.length > 1) {
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    const mentioned = getMentionedIndicators(text, input.indicators);

    // Deteksi inversi logika: jika hanya menyebut indikator terlemah dan tidak menyebut indikator terkuat
    const mentionedBottom = mentioned.some((m) => m.indicator === bottom.indicator);
    const mentionedTop = mentioned.some((m) => m.indicator === top.indicator);
    if (mentionedBottom && !mentionedTop && top.percentage - bottom.percentage >= 20) {
      return fallbackStrength(input);
    }
  }

  text = correctHallucinatedPercentages(text, input);

  if (!/[.!?]$/.test(text)) text += ".";

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 4 || words.length > 40) return fallbackStrength(input);

  return text;
}

/**
 * Validasi baris Fokus:
 * Mencegah model menyuruh fokus pada indikator yang nilainya sudah sempurna.
 */
function validateAndSanitizeFocus(
  rawText: string,
  input: RecommendationInput,
): string {
  let text = rawText.replace(/^fokus\s*[:-]?\s*/i, "").trim();
  if (text.length < 10) return fallbackFocus(input);
  if (FORBIDDEN_META_RE.test(text)) return fallbackFocus(input);
  if (hasForeignTopic(text, input.indicators)) return fallbackFocus(input);

  const sorted = sortedIndicators(input.indicators);
  if (sorted.length > 1) {
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    const mentioned = getMentionedIndicators(text, input.indicators);

    // Jika indikator terkuat 100% dan terlemah < 70%, tapi fokus malah menyebut yang sudah 100%
    const mentionedTop = mentioned.some((m) => m.indicator === top.indicator);
    const mentionedBottom = mentioned.some((m) => m.indicator === bottom.indicator);
    if (mentionedTop && !mentionedBottom && top.percentage === 100 && bottom.percentage < 70) {
      return fallbackFocus(input);
    }
  }

  if (!/[.!?]$/.test(text)) text += ".";

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 3 || words.length > 35) return fallbackFocus(input);

  return text;
}

/**
 * Validasi baris Langkah:
 * Mencegah kalimat terpotong di tengah jalan atau memuat instruksi yang tidak relevan.
 */
function validateAndSanitizeStep(
  rawText: string,
  stepIndex: number,
  input: RecommendationInput,
): string {
  let text = rawText.replace(/^langkah\s*\d*\s*[:-]?\s*/i, "").trim();
  const fallback = fallbackSteps(input)[stepIndex];

  if (text.length < 10) return fallback;
  if (FORBIDDEN_META_RE.test(text)) return fallback;
  if (hasForeignTopic(text, input.indicators)) return fallback;

  // Cek apakah kalimat terpotong di akhir dengan kata sambung/depan
  if (/\b(dan|atau|tetapi|karena|pada|di|ke|dengan|untuk|yang)\s*$/i.test(text)) {
    return fallback;
  }

  if (!/[.!?]$/.test(text)) text += ".";

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 3 || words.length > 35) return fallback;

  return text;
}

/**
 * Petakan teks model ke slot lima bagian berlabel.
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
 * Normalisasi dan verifikasi ground-truth penuh untuk mencegah halusinasi.
 */
function normalizeOutput(raw: string, input: RecommendationInput): string {
  const sanitizedRaw = sanitize(raw);
  const parsed = parseRecommendation(sanitizedRaw);

  const strength = validateAndSanitizeStrength(parsed.strength, input);
  const focus = validateAndSanitizeFocus(parsed.focus, input);
  const step1 = validateAndSanitizeStep(parsed.steps[0], 0, input);
  const step2 = validateAndSanitizeStep(parsed.steps[1], 1, input);
  const step3 = validateAndSanitizeStep(parsed.steps[2], 2, input);

  return [
    `Kekuatan: ${strength}`,
    `Fokus: ${focus}`,
    `Langkah 1: ${step1}`,
    `Langkah 2: ${step2}`,
    `Langkah 3: ${step3}`,
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
      temperature: 0.2,
      max_tokens: 350,
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
      temperature: 0.2,
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

/** Minta rekomendasi belajar. Selalu terpenuhi dengan verifikasi ground-truth. */
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
      /* Dev fallback bila proxy belum jalan */
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
