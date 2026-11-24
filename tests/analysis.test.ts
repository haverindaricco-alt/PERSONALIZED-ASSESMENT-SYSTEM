import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAnalysisInput,
  buildClassOverview,
  feedbackPreview,
  parseClassReport,
  parseStudentAnalysis,
  statusFromPercentage,
} from "../src/lib/analysis.ts";
import type { ResultRow, StudentAnalysis } from "../src/types.ts";

const studentAnalysis: StudentAnalysis = {
  version: 2,
  id_siswa: "siswa-1",
  ringkasan_indikator: [
    { indikator: "I2", nama: "Gradien dua titik", benar: 1, total: 2, status: "Perlu Diperkuat" },
  ],
  analisis_butir: [
    {
      id_butir: "q1",
      indikator: "I2",
      jawaban_akhir: "salah",
      langkah_pertama_keliru: "y2 - y1 tertukar dengan x2 - x1",
      jenis_kesalahan: "perhitungan",
      catatan_proses: "",
    },
  ],
  umpan_balik_siswa: {
    pembuka: "Kamu sudah menuliskan langkah dengan rapi.",
    per_indikator: [
      {
        indikator: "I2",
        yang_sudah_baik: "Rumus gradien sudah dipilih.",
        yang_perlu_diperkuat: "Urutan selisih koordinat perlu diperiksa.",
        kemungkinan_penyebab: "Kemungkinan tertukar saat mengurangkan.",
        langkah_perbaikan: ["Tulis x2 - x1 lebih dahulu."],
        petunjuk: "Koordinator mana yang harus dikurangi lebih dahulu?",
      },
    ],
    penutup: "Lanjutkan latihan secara bertahap.",
  },
  laporan_guru: {
    gambaran_umum: "Satu indikator perlu penguatan.",
    indikator_dikuasai: [],
    indikator_perlu_perhatian: [
      {
        indikator: "I2",
        dugaan_jenis_kesalahan: "perhitungan",
        bukti: "Selisih koordinat tidak konsisten.",
        pola_berulang: true,
        rekomendasi_tindak_lanjut: "Latihan terbimbing selisih koordinat.",
      },
    ],
    butir_benar_proses_perlu_diperiksa: [],
    catatan_kehati_hatian: "Perlu konfirmasi guru.",
  },
  generated_at: "2026-11-23T00:00:00.000Z",
};

function makeResult(overrides: Partial<ResultRow> = {}): ResultRow {
  return {
    id: "siswa-1",
    student_name: "Ayu",
    token_used: "UJIAN2026",
    score: 50,
    correct_count: 1,
    wrong_count: 1,
    total_questions: 2,
    completion_status: "SELESAI",
    answers_json: { q1: "m = (x2 - x1)/(y2 - y1)", q2: "2" },
    answers_correct_json: { q1: false, q2: true },
    answers_key_json: { q1: "(y2 - y1)/(x2 - x1)", q2: "2" },
    indicator_summary_json: [
      { indicator: "I2", total: 2, correct: 1, percentage: 50 },
    ],
    ai_recommendation: JSON.stringify(studentAnalysis),
    created_at: "2026-11-23T00:00:00.000Z",
    ...overrides,
  };
}

const questionMap = new Map([
  [
    "q1",
    {
      id: "q1",
      question_number: 2,
      question_text: "Tentukan gradien dari dua titik.",
      indicator: "I2",
    },
  ],
  [
    "q2",
    {
      id: "q2",
      question_number: 1,
      question_text: "Hitung 1 + 1.",
      indicator: "I1",
    },
  ],
]);

test("status indikator mengikuti ambang 70 dan 50", () => {
  assert.equal(statusFromPercentage(80), "Dikuasai");
  assert.equal(statusFromPercentage(70), "Dikuasai");
  assert.equal(statusFromPercentage(60), "Perlu Diperkuat");
  assert.equal(statusFromPercentage(49), "Belum Dikuasai");
});

test("data masukan siswa memuat butir terurut dan status dari server", () => {
  const input = buildAnalysisInput(makeResult(), questionMap);
  assert.equal(input.id_siswa, "siswa-1");
  assert.equal(input.daftar_butir.length, 2);
  assert.equal(input.daftar_butir[0].id_butir, "q2");
  assert.equal(input.daftar_butir[0].status_benar_salah, "benar");
  assert.equal(input.daftar_butir[1].status_benar_salah, "salah");
  assert.equal(input.daftar_butir[1].indikator, "I2");
});

test("analisis siswa JSON dapat dibaca kembali", () => {
  const parsed = parseStudentAnalysis(JSON.stringify(studentAnalysis));
  assert.ok(parsed);
  assert.equal(parsed.umpan_balik_siswa.per_indikator[0].indikator, "I2");
  assert.equal(parsed.laporan_guru.indikator_perlu_perhatian[0].pola_berulang, true);
});

test("analisis siswa dari balasan berpagar markdown tetap terbaca", () => {
  const raw = "```json\n" + JSON.stringify(studentAnalysis) + "\n```";
  assert.ok(parseStudentAnalysis(raw));
});

test("teks rekomendasi lama tidak dianggap JSON", () => {
  assert.equal(parseStudentAnalysis("Kekuatan: baik\nFokus: gradien"), null);
});

test("ringkasan kelas menghitung indikator dan pola kesalahan", () => {
  const overview = buildClassOverview([
    makeResult(),
    makeResult({
      id: "siswa-2",
      student_name: "Bima",
      score: 100,
      correct_count: 2,
      wrong_count: 0,
      ai_recommendation: null,
      indicator_summary_json: [
        { indicator: "I2", total: 2, correct: 2, percentage: 100 },
      ],
    }),
  ]);

  assert.equal(overview.students, 2);
  assert.equal(overview.averageScore, 75);
  assert.equal(overview.analyzed, 1);
  assert.equal(overview.indicators[0].correct, 3);
  assert.equal(overview.indicators[0].total, 4);
  assert.equal(overview.indicators[0].studentsMastered, 1);
  assert.equal(overview.patterns[0].indikator, "I2");
});

test("laporan kelas memakai persentase untuk menentukan status", () => {
  const report = parseClassReport(
    JSON.stringify({
      gambaran_umum: "Kelas perlu penguatan.",
      penguasaan_indikator: [
        { indikator: "I2", persentase: 40, status_kelas: "Dikuasai", catatan: "" },
      ],
      pola_kesalahan: [],
      siswa_perlu_perhatian: [],
      rekomendasi_pembelajaran: ["Latihan gradien."],
      catatan_kehati_hatian: "",
    }),
    "UJIAN2026",
    2,
  );
  assert.ok(report);
  assert.equal(report.penguasaan_indikator[0].status_kelas, "Belum Dikuasai");
  assert.equal(report.jumlah_siswa, 2);
});

test("butir tidak dijawab tetap ikut dianalisis sebagai kosong", () => {
  const input = buildAnalysisInput(
    makeResult({ answers_json: { q2: "2" } }),
    questionMap,
  );
  const blank = input.daftar_butir.find((i) => i.id_butir === "q1");
  assert.ok(blank);
  assert.equal(blank.jawaban_siswa, "(kosong)");
  assert.equal(blank.status_benar_salah, "salah");
});

test("jenis kesalahan di luar kategori resmi dibakukan", () => {
  const raw = JSON.parse(JSON.stringify(studentAnalysis));
  raw.analisis_butir[0].jenis_kesalahan = "salah_tidak_dikenal";
  const parsed = parseStudentAnalysis(JSON.stringify(raw));
  assert.ok(parsed);
  assert.equal(
    parsed.analisis_butir[0].jenis_kesalahan,
    "tidak dapat ditentukan",
  );
});

test("cuplikan umpan balik memakai paragraf atau pembuka", () => {
  assert.equal(
    feedbackPreview(studentAnalysis),
    "Kamu sudah menuliskan langkah dengan rapi.",
  );
  assert.equal(feedbackPreview(null), "");

  const withParagraphs = {
    ...studentAnalysis,
    umpan_balik_siswa: {
      paragraf: [
        "Kerja bagus! Kamu sudah memahami konsep dasar gradien.",
        "Namun perhatikan tanda minus saat mensubstitusikan koordinat.",
        "Terus berlatih dengan soal variasi.",
      ],
    },
  };
  const parsed = parseStudentAnalysis(JSON.stringify(withParagraphs));
  assert.ok(parsed);
  assert.equal(parsed.umpan_balik_siswa.paragraf?.length, 3);
  assert.equal(
    feedbackPreview(parsed),
    "Kerja bagus! Kamu sudah memahami konsep dasar gradien.",
  );
});
