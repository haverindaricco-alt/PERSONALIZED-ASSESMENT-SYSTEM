import type {
  ClassPattern,
  ClassReport,
  CompletionKind,
  IndicatorStatus,
  ResultRow,
  StudentAnalysis,
  StudentAnalysisInput,
  StudentQuestion,
} from "../types";

export const MASTERY_THRESHOLD = 70;

/** Salinan kecil classifyCompletion agar modul ini bisa diuji tanpa
    resolver import runtime TypeScript. */
function completionKind(status: string): CompletionKind {
  if (status.includes("Pelanggaran Fokus")) return "violation";
  if (status.includes("Waktu Habis")) return "timeout";
  return "done";
}

export function statusFromPercentage(percentage: number): IndicatorStatus {
  if (percentage >= MASTERY_THRESHOLD) return "Dikuasai";
  if (percentage >= 50) return "Perlu Diperkuat";
  return "Belum Dikuasai";
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function limit(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/* ---------- Data masukan untuk AI per siswa ---------- */

export function buildAnalysisInput(
  result: ResultRow,
  questionMap: Map<string, StudentQuestion>,
): StudentAnalysisInput {
  const answerMap = result.answers_json ?? {};
  const correctMap = result.answers_correct_json ?? {};
  const keyMap = result.answers_key_json ?? {};
  /* Sertakan butir yang tidak dijawab (ada di peta benar/salah server)
     agar AI dapat menandainya sebagai "tidak dapat ditentukan". */
  const qids = [...new Set([...Object.keys(correctMap), ...Object.keys(answerMap)])];

  const daftar_butir = qids
    .map((qid) => {
      const q = questionMap.get(qid);
      const answer = answerMap[qid];
      return {
        qid,
        number: q?.question_number ?? 0,
        item: {
          id_butir: qid,
          indikator: q?.indicator?.trim() || "Umum",
          teks_soal: limit(
            q?.question_text?.trim() || "(Soal tidak tersedia di bank.)",
            400,
          ),
          kunci_jawaban: limit(keyMap[qid]?.trim() || "", 160),
          jawaban_siswa: limit(answer?.trim() || "(kosong)", 1200),
          status_benar_salah:
            correctMap[qid] === true
              ? ("benar" as const)
              : ("salah" as const),
        },
      };
    })
    .sort((a, b) => a.number - b.number)
    .map((row) => row.item);

  const ringkasan = (result.indicator_summary_json ?? []).map((i) => ({
    indikator: i.indicator,
    nama: i.indicator,
    benar: i.correct,
    total: i.total,
    persentase: Math.round(i.percentage * 10) / 10,
    status: statusFromPercentage(i.percentage),
  }));

  return {
    id_siswa: result.id,
    nama: result.student_name,
    nilai: result.score,
    jumlah_benar: result.correct_count,
    jumlah_salah: result.wrong_count,
    total_soal: result.total_questions,
    status_pengerjaan: result.completion_status,
    ringkasan_indikator: ringkasan,
    daftar_butir,
  };
}

/* ---------- Parsing keluaran AI per siswa ---------- */

const ERROR_TYPES = new Set([
  "konseptual",
  "prosedural",
  "perhitungan",
  "terbawa dari langkah sebelumnya",
  "tidak dapat ditentukan",
  "tidak ada",
]);

function errorType(value: unknown): string {
  const raw = text(value, "tidak dapat ditentukan").toLowerCase().trim();
  return ERROR_TYPES.has(raw) ? raw : "tidak dapat ditentukan";
}

function normalizeItem(raw: unknown): StudentAnalysis["analisis_butir"][number] {
  const o = record(raw);
  return {
    id_butir: text(o.id_butir),
    indikator: text(o.indikator, "Umum"),
    jawaban_akhir: o.jawaban_akhir === "benar" ? "benar" : "salah",
    langkah_pertama_keliru: o.langkah_pertama_keliru
      ? text(o.langkah_pertama_keliru)
      : null,
    jenis_kesalahan: errorType(o.jenis_kesalahan),
    catatan_proses: text(o.catatan_proses),
  };
}

function normalizeIndicatorFeedback(
  raw: unknown,
): StudentAnalysis["umpan_balik_siswa"]["per_indikator"][number] {
  const o = record(raw);
  return {
    indikator: text(o.indikator, "Umum"),
    yang_sudah_baik: text(o.yang_sudah_baik),
    yang_perlu_diperkuat: text(o.yang_perlu_diperkuat),
    kemungkinan_penyebab: text(o.kemungkinan_penyebab),
    langkah_perbaikan: array(o.langkah_perbaikan).map((s) => text(s)).filter(Boolean),
    petunjuk: text(o.petunjuk),
  };
}

function normalizeTeacherNote(
  raw: unknown,
): StudentAnalysis["laporan_guru"]["indikator_perlu_perhatian"][number] {
  const o = record(raw);
  return {
    indikator: text(o.indikator, "Umum"),
    dugaan_jenis_kesalahan: errorType(o.dugaan_jenis_kesalahan),
    bukti: text(o.bukti),
    pola_berulang: o.pola_berulang === true,
    rekomendasi_tindak_lanjut: text(o.rekomendasi_tindak_lanjut),
  };
}

function extractJson(raw: string): unknown | null {
  const clean = raw
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(clean.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** Mengenali rekomendasi lama (lima baris teks) sebagai bukan analisis JSON. */
export function parseStudentAnalysis(
  raw: string | null | undefined,
): StudentAnalysis | null {
  if (!raw || !raw.includes("{")) return null;
  const obj = extractJson(raw);
  const o = record(obj);
  const feedback = record(o.umpan_balik_siswa);
  const report = record(o.laporan_guru);
  if (!o.umpan_balik_siswa || !o.laporan_guru) return null;

  return {
    version: 2,
    id_siswa: text(o.id_siswa),
    ringkasan_indikator: array(o.ringkasan_indikator).map((row) => {
      const r = record(row);
      return {
        indikator: text(r.indikator, "Umum"),
        nama: text(r.nama, text(r.indikator, "Umum")),
        benar: Number(r.benar) || 0,
        total: Number(r.total) || 0,
        status: text(r.status, "Belum Dikuasai"),
      };
    }),
    analisis_butir: array(o.analisis_butir).map(normalizeItem),
    umpan_balik_siswa: {
      pembuka: text(feedback.pembuka),
      per_indikator: array(feedback.per_indikator).map(normalizeIndicatorFeedback),
      penutup: text(feedback.penutup),
    },
    laporan_guru: {
      gambaran_umum: text(report.gambaran_umum),
      indikator_dikuasai: array(report.indikator_dikuasai)
        .map((s) => text(s))
        .filter(Boolean),
      indikator_perlu_perhatian: array(report.indikator_perlu_perhatian).map(
        normalizeTeacherNote,
      ),
      butir_benar_proses_perlu_diperiksa: array(
        report.butir_benar_proses_perlu_diperiksa,
      )
        .map((s) => text(s))
        .filter(Boolean),
      catatan_kehati_hatian: text(report.catatan_kehati_hatian),
    },
    generated_at: text(o.generated_at, new Date().toISOString()),
  };
}

/* ---------- Ringkasan kelas ---------- */

export interface ClassIndicatorStat {
  indicator: string;
  total: number;
  correct: number;
  percentage: number;
  studentsMastered: number;
}

export interface ClassAttention {
  nama: string;
  alasan: string;
}

export interface ClassOverview {
  students: number;
  averageScore: number;
  completion: { done: number; timeout: number; violation: number };
  indicators: ClassIndicatorStat[];
  analyzed: number;
  processChecks: number;
  patterns: ClassPattern[];
  attention: ClassAttention[];
}

function sortIndicator(a: string, b: string): number {
  return a.localeCompare(b, "id-ID", { numeric: true, sensitivity: "base" });
}

export function buildClassOverview(results: ResultRow[]): ClassOverview {
  const indicatorMap = new Map<
    string,
    { total: number; correct: number; mastered: number }
  >();
  const patternMap = new Map<string, ClassPattern & { samples: string[] }>();
  const attention: ClassAttention[] = [];
  let analyzed = 0;
  let processChecks = 0;
  let scoreSum = 0;
  const completion = { done: 0, timeout: 0, violation: 0 };

  for (const result of results) {
    scoreSum += result.score;
    completion[completionKind(result.completion_status)] += 1;

    for (const item of result.indicator_summary_json ?? []) {
      const entry = indicatorMap.get(item.indicator) ?? {
        total: 0,
        correct: 0,
        mastered: 0,
      };
      entry.total += item.total;
      entry.correct += item.correct;
      if (item.percentage >= MASTERY_THRESHOLD) entry.mastered += 1;
      indicatorMap.set(item.indicator, entry);
    }

    const analysis = parseStudentAnalysis(result.ai_recommendation);
    if (!analysis) continue;
    analyzed += 1;
    processChecks += analysis.laporan_guru.butir_benar_proses_perlu_diperiksa.length;

    for (const note of analysis.laporan_guru.indikator_perlu_perhatian) {
      const key = `${note.indikator}::${note.dugaan_jenis_kesalahan}`;
      const existing = patternMap.get(key) ?? {
        indikator: note.indikator,
        dugaan_jenis_kesalahan: note.dugaan_jenis_kesalahan,
        bukti: "",
        pola_berulang: false,
        rekomendasi_tindak_lanjut: note.rekomendasi_tindak_lanjut,
        samples: [],
      };
      existing.pola_berulang = existing.pola_berulang || note.pola_berulang;
      if (note.bukti) existing.samples.push(limit(note.bukti, 180));
      if (!existing.rekomendasi_tindak_lanjut) {
        existing.rekomendasi_tindak_lanjut = note.rekomendasi_tindak_lanjut;
      }
      patternMap.set(key, existing);
    }

    const firstNote = analysis.laporan_guru.indikator_perlu_perhatian[0];
    if (firstNote) {
      attention.push({
        nama: result.student_name,
        alasan: `${firstNote.indikator}: ${firstNote.dugaan_jenis_kesalahan}${
          firstNote.bukti ? ` — ${limit(firstNote.bukti, 140)}` : ""
        }`,
      });
    }
  }

  const patterns = [...patternMap.values()]
    .map((p) => ({
      indikator: p.indikator,
      dugaan_jenis_kesalahan: p.dugaan_jenis_kesalahan,
      bukti: p.samples.slice(0, 2).join(" | "),
      pola_berulang: p.pola_berulang,
      rekomendasi_tindak_lanjut: p.rekomendasi_tindak_lanjut,
    }))
    .sort((a, b) => sortIndicator(a.indikator, b.indikator));

  const indicators = [...indicatorMap.entries()]
    .map(([indicator, v]) => ({
      indicator,
      total: v.total,
      correct: v.correct,
      percentage: v.total > 0 ? (v.correct / v.total) * 100 : 0,
      studentsMastered: v.mastered,
    }))
    .sort((a, b) => sortIndicator(a.indicator, b.indicator));

  return {
    students: results.length,
    averageScore:
      results.length > 0 ? scoreSum / results.length : 0,
    completion,
    indicators,
    analyzed,
    processChecks,
    patterns,
    attention,
  };
}

/** Data ringkas untuk prompt AI tingkat kelas (dibatasi agar muat di proxy). */
export function buildClassPromptData(
  token: string,
  results: ResultRow[],
  overview: ClassOverview,
): string {
  const lines: string[] = [];
  lines.push(`Token/sesi: ${token}`);
  lines.push(`Jumlah siswa: ${overview.students}`);
  lines.push(
    `Rata-rata nilai: ${overview.averageScore.toLocaleString("id-ID", {
      maximumFractionDigits: 2,
    })} dari 100`,
  );
  lines.push(
    `Status pengerjaan: SELESAI ${overview.completion.done}, waktu habis ${overview.completion.timeout}, pelanggaran ${overview.completion.violation}`,
  );
  lines.push("");
  lines.push("Penguasaan indikator tingkat kelas:");
  for (const i of overview.indicators) {
    lines.push(
      `- ${i.indicator}: ${i.correct}/${i.total} butir benar (${Math.round(
        i.percentage,
      )}%), ${i.studentsMastered} siswa pada ambang >= ${MASTERY_THRESHOLD}%`,
    );
  }

  lines.push("");
  lines.push("Ringkasan per siswa (maksimal 40 siswa terbaru):");
  const limitedResults = results.slice(0, 40);
  for (const result of limitedResults) {
    const summary = (result.indicator_summary_json ?? [])
      .map(
        (i) =>
          `${i.indicator} ${i.correct}/${i.total} ${statusFromPercentage(
            i.percentage,
          )}`,
      )
      .join("; ");
    lines.push(
      `- ${result.student_name} | nilai ${result.score} | ${result.completion_status} | ${summary || "tanpa data indikator"}`,
    );
  }

  const notes: string[] = [];
  for (const result of limitedResults) {
    const analysis = parseStudentAnalysis(result.ai_recommendation);
    if (!analysis) continue;
    for (const note of analysis.laporan_guru.indikator_perlu_perhatian.slice(0, 2)) {
      notes.push(
        `- ${result.student_name} | ${note.indikator} | ${note.dugaan_jenis_kesalahan}${
          note.pola_berulang ? " | pola berulang" : ""
        } | bukti: ${limit(note.bukti, 140)}`,
      );
    }
  }
  if (notes.length > 0) {
    lines.push("");
    lines.push("Catatan analisis per siswa yang sudah tersedia:");
    lines.push(...notes.slice(0, 60));
  }

  return lines.join("\n");
}

/* ---------- Parsing keluaran AI tingkat kelas ---------- */

export function parseClassReport(
  raw: string,
  token: string,
  studentCount: number,
): ClassReport | null {
  const obj = extractJson(raw);
  const o = record(obj);
  if (!o.gambaran_umum) return null;

  const penguasaan = array(o.penguasaan_indikator).map((row) => {
    const r = record(row);
    const percentage = Number(r.persentase) || 0;
    return {
      indikator: text(r.indikator, "Umum"),
      persentase: percentage,
      status_kelas: statusFromPercentage(percentage),
      catatan: text(r.catatan),
    };
  });

  const pola = array(o.pola_kesalahan).map((row) => {
    const r = record(row);
    return {
      indikator: text(r.indikator, "Umum"),
      dugaan_jenis_kesalahan: errorType(r.dugaan_jenis_kesalahan),
      bukti: text(r.bukti),
      pola_berulang: r.pola_berulang === true,
      rekomendasi_tindak_lanjut: text(r.rekomendasi_tindak_lanjut),
    };
  });

  return {
    version: 2,
    token,
    jumlah_siswa: studentCount,
    gambaran_umum: text(o.gambaran_umum),
    penguasaan_indikator: penguasaan,
    pola_kesalahan: pola,
    siswa_perlu_perhatian: array(o.siswa_perlu_perhatian).map((row) => {
      const r = record(row);
      return { nama: text(r.nama), alasan: text(r.alasan) };
    }),
    rekomendasi_pembelajaran: array(o.rekomendasi_pembelajaran)
      .map((s) => text(s))
      .filter(Boolean),
    catatan_kehati_hatian: text(o.catatan_kehati_hatian),
    generated_at: new Date().toISOString(),
  };
}

/** Cuplikan untuk kolom umpan balik pada rekap nilai. */
export function feedbackPreview(analysis: StudentAnalysis | null): string {
  if (!analysis) return "";
  const first = analysis.umpan_balik_siswa.per_indikator[0];
  return (
    analysis.umpan_balik_siswa.pembuka ||
    first?.yang_perlu_diperkuat ||
    first?.yang_sudah_baik ||
    analysis.laporan_guru.gambaran_umum ||
    ""
  );
}
