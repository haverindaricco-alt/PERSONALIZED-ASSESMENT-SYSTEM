/** Soal versi aman milik siswa: TANPA kunci jawaban.
    Dikirim dari view questions_public (security-patch.sql). */
export interface StudentQuestion {
  id: string;
  question_number: number;
  question_text: string;
  indicator: string;
}

/** Soal lengkap milik admin (bisa tayang kunci jawaban). */
export interface QuestionRow extends StudentQuestion {
  /** Kunci jawaban berupa rumus/nilai, misalnya "5/6". */
  answer_key: string;
  /** Alternatif teks yang diterima, misalnya ["lima per enam"]. */
  answer_alternatives: string[];
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

/** Jawaban siswa berdasarkan id soal, berupa teks yang diketik. */
export type AnswerMap = Record<string, string>;

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
  /** Peta id soal -> teks kunci (rumus) untuk soal yang dijawab. */
  answers_key_json: Record<string, string> | null;
  indicator_summary_json: IndicatorSummary[] | null;
  /** JSON StudentAnalysis (versi 2) atau teks rekomendasi lama. */
  ai_recommendation: string | null;
  created_at: string;
}

/* ---------- Analisis AI terstruktur ---------- */

export type IndicatorStatus =
  | "Dikuasai"
  | "Perlu Diperkuat"
  | "Belum Dikuasai";

export interface AnalysisItemInput {
  id_butir: string;
  indikator: string;
  teks_soal: string;
  kunci_jawaban: string;
  jawaban_siswa: string;
  status_benar_salah: "benar" | "salah";
}

export interface StudentAnalysisInput {
  id_siswa: string;
  nama: string;
  nilai: number;
  jumlah_benar: number;
  jumlah_salah: number;
  total_soal: number;
  status_pengerjaan: string;
  ringkasan_indikator: Array<{
    indikator: string;
    nama: string;
    benar: number;
    total: number;
    persentase: number;
    status: IndicatorStatus;
  }>;
  daftar_butir: AnalysisItemInput[];
}

export interface ItemAnalysis {
  id_butir: string;
  indikator: string;
  jawaban_akhir: "benar" | "salah";
  langkah_pertama_keliru: string | null;
  jenis_kesalahan: string;
  catatan_proses: string;
}

export interface IndicatorFeedback {
  indikator: string;
  yang_sudah_baik: string;
  yang_perlu_diperkuat: string;
  kemungkinan_penyebab: string;
  langkah_perbaikan: string[];
  petunjuk: string;
}

export interface StudentFeedback {
  /** Narasi umpan balik padat dalam bentuk beberapa paragraf. */
  paragraf?: string[];
  ringkasan?: string;
  /** Format lama (per-indikator) tetap didukung untuk kompatibilitas data. */
  pembuka?: string;
  per_indikator?: IndicatorFeedback[];
  penutup?: string;
}

export interface TeacherIndicatorNote {
  indikator: string;
  dugaan_jenis_kesalahan: string;
  bukti: string;
  pola_berulang: boolean;
  rekomendasi_tindak_lanjut: string;
}

export interface StudentAnalysis {
  version: 2;
  id_siswa: string;
  ringkasan_indikator: Array<{
    indikator: string;
    nama: string;
    benar: number;
    total: number;
    status: string;
  }>;
  analisis_butir: ItemAnalysis[];
  umpan_balik_siswa: StudentFeedback;
  laporan_guru: {
    gambaran_umum: string;
    indikator_dikuasai: string[];
    indikator_perlu_perhatian: TeacherIndicatorNote[];
    butir_benar_proses_perlu_diperiksa: string[];
    catatan_kehati_hatian: string;
  };
  generated_at: string;
}

export interface ClassPattern {
  indikator: string;
  dugaan_jenis_kesalahan: string;
  bukti: string;
  pola_berulang: boolean;
  rekomendasi_tindak_lanjut: string;
}

export interface ClassReport {
  version: 2;
  token: string;
  jumlah_siswa: number;
  gambaran_umum: string;
  penguasaan_indikator: Array<{
    indikator: string;
    persentase: number;
    status_kelas: IndicatorStatus;
    catatan: string;
  }>;
  pola_kesalahan: ClassPattern[];
  siswa_perlu_perhatian: Array<{ nama: string; alasan: string }>;
  rekomendasi_pembelajaran: string[];
  catatan_kehati_hatian: string;
  generated_at: string;
}

export interface ClassReportRow {
  id: string;
  token_used: string;
  student_count: number;
  summary_json: ClassReport;
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
