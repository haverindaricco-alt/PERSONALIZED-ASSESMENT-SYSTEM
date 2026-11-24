import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BookOpen,
  Check,
  ClipboardList,
  Copy,
  Download,
  GraduationCap,
  Loader2,
  LogOut,
  MessageSquare,
  Pencil,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { AppNavbar } from "../../components/nav";
import { FractionTextarea } from "../../components/FractionTextarea";
import { MathText } from "../../components/MathText";
import { StudentFeedbackView } from "../../components/StudentFeedbackView";
import {
  Button,
  Card,
  Field,
  Modal,
  btnPearlClass,
  inputClass,
  selectClass,
} from "../../components/ui";
import { supabase } from "../../lib/supabase";
import {
  deleteAllResults,
  deleteQuestion,
  deleteResults,
  errorMessage,
  fetchAllResults,
  fetchFirstSettings,
  fetchLatestClassReport,
  fetchQuestionsAdmin,
  fetchResults,
  insertQuestion,
  saveClassReport,
  updateQuestion,
  updateSettings,
} from "../../lib/supabase";
import { canonicalAnswer } from "../../lib/answerFormat";
import {
  buildClassOverview,
  feedbackPreview,
  parseStudentAnalysis,
  statusFromPercentage,
} from "../../lib/analysis";
import { summarizeClass } from "../../lib/agnes";
import { exportResultsToExcel } from "../../lib/exportResults";
import { normalizeMathText } from "../../lib/mathText";
import { formatIdDateTime, formatScore } from "../../lib/scoring";
import {
  classifyCompletion,
  type ClassReportRow,
  type QuestionRow,
  type ResultRow,
  type StudentAnalysis,
} from "../../types";

type Tab = "settings" | "bank" | "recap" | "teacher";

const TABS: Array<{ id: Tab; label: string; icon: typeof Settings2 }> = [
  { id: "settings", label: "Pengaturan", icon: Settings2 },
  { id: "bank", label: "Bank Soal", icon: BookOpen },
  { id: "recap", label: "Rekap Nilai", icon: ClipboardList },
  { id: "teacher", label: "Ringkasan untuk Guru", icon: GraduationCap },
];

interface QuestionForm {
  id?: string;
  question_number: number;
  question_text: string;
  answer_key: string;
  answer_alternatives: string[];
  indicator: string;
}

const EMPTY_FORM: QuestionForm = {
  question_number: 0,
  question_text: "",
  answer_key: "",
  answer_alternatives: [""],
  indicator: "Umum",
};

function formatFeedbackText(row: ResultRow): string {
  const analysis = parseStudentAnalysis(row.ai_recommendation);
  if (!analysis) return row.ai_recommendation || "Belum ada umpan balik.";
  const fb = analysis.umpan_balik_siswa;
  const lines: string[] = [];
  lines.push(`Feedback Asesmen PGL - ${row.student_name}`);
  lines.push(`Nilai: ${formatScore(row.score)} | Token: ${row.token_used}`);
  lines.push("");

  const paragraphs =
    fb.paragraf && fb.paragraf.length > 0
      ? fb.paragraf
      : fb.ringkasan
        ? fb.ringkasan
            .split(/\n\s*\n/)
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

  if (paragraphs.length > 0) {
    for (const p of paragraphs) {
      lines.push(p);
      lines.push("");
    }
  } else {
    // Fallback data lama (per indikator)
    if (fb.pembuka) {
      lines.push(fb.pembuka);
      lines.push("");
    }
    for (const item of fb.per_indikator ?? []) {
      lines.push(`[Indikator: ${item.indikator}]`);
      if (item.yang_sudah_baik) lines.push(`• Sudah baik: ${item.yang_sudah_baik}`);
      if (item.yang_perlu_diperkuat) lines.push(`• Perlu diperkuat: ${item.yang_perlu_diperkuat}`);
      if (item.kemungkinan_penyebab) lines.push(`• Catatan dugaan: ${item.kemungkinan_penyebab}`);
      if (item.langkah_perbaikan && item.langkah_perbaikan.length > 0) {
        lines.push("• Langkah perbaikan:");
        for (const step of item.langkah_perbaikan) {
          lines.push(`  - ${step}`);
        }
      }
      if (item.petunjuk) lines.push(`• Petunjuk: ${item.petunjuk}`);
      lines.push("");
    }
    if (fb.penutup) {
      lines.push(fb.penutup);
    }
  }

  return lines.join("\n").trim();
}

function formatClassReportText(report: ClassReportRow): string {
  const sum = report.summary_json;
  const lines: string[] = [];
  lines.push(`RINGKASAN ASESMEN KELAS UNTUK GURU`);
  lines.push(`Sesi (Token): ${report.token_used} | Jumlah Siswa: ${report.student_count}`);
  lines.push(`Waktu Analisis: ${formatIdDateTime(report.created_at)}`);
  lines.push("");
  lines.push("1. GAMBARAN UMUM KELAS:");
  lines.push(sum.gambaran_umum);
  lines.push("");
  if (sum.penguasaan_indikator.length > 0) {
    lines.push("2. STATUS PENGUASAAN INDIKATOR KELAS:");
    for (const ind of sum.penguasaan_indikator) {
      lines.push(`- ${ind.indikator}: ${Math.round(ind.persentase)}% (${ind.status_kelas})`);
    }
    lines.push("");
  }
  if (sum.pola_kesalahan.length > 0) {
    lines.push("3. POLA KESALAHAN YANG PERLU DITINDAKLANJUTI:");
    for (const p of sum.pola_kesalahan) {
      lines.push(`- [${p.indikator}] Dugaan: ${p.dugaan_jenis_kesalahan}${p.pola_berulang ? " (Pola Berulang)" : ""}`);
      if (p.bukti) lines.push(`  Bukti: ${p.bukti}`);
      if (p.rekomendasi_tindak_lanjut) lines.push(`  Tindak Lanjut: ${p.rekomendasi_tindak_lanjut}`);
    }
    lines.push("");
  }
  if (sum.siswa_perlu_perhatian.length > 0) {
    lines.push("4. SISWA YANG PERLU PERHATIAN KHUSUS:");
    for (const s of sum.siswa_perlu_perhatian) {
      lines.push(`- ${s.nama}: ${s.alasan}`);
    }
    lines.push("");
  }
  if (sum.rekomendasi_pembelajaran.length > 0) {
    lines.push("5. REKOMENDASI PEMBELAJARAN UNTUK GURU:");
    sum.rekomendasi_pembelajaran.forEach((r, idx) => {
      lines.push(`${idx + 1}. ${r}`);
    });
    lines.push("");
  }
  if (sum.catatan_kehati_hatian) {
    lines.push("CATATAN KEHATI-HATIAN:");
    lines.push(sum.catatan_kehati_hatian);
  }
  return lines.join("\n");
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("settings");

  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"AKTIF" | "TIDAK_AKTIF">("AKTIF");
  const [duration, setDuration] = useState(30);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* Rekap nilai: pilih baris, hapus, dan ekspor. */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteMode, setDeleteMode] = useState<"selected" | "all" | null>(null);
  const [deletingResults, setDeletingResults] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [feedbackRow, setFeedbackRow] = useState<ResultRow | null>(null);
  const [feedbackModalTab, setFeedbackModalTab] = useState<"student" | "diagnostic">("student");
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [copiedClassSummary, setCopiedClassSummary] = useState(false);

  function copyStudentFeedback(row: ResultRow) {
    const text = formatFeedbackText(row);
    void navigator.clipboard.writeText(text);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2000);
  }

  function copyClassReport(report: ClassReportRow) {
    const text = formatClassReportText(report);
    void navigator.clipboard.writeText(text);
    setCopiedClassSummary(true);
    setTimeout(() => setCopiedClassSummary(false), 2000);
  }

  /* Ringkasan untuk guru. */
  const [classToken, setClassToken] = useState("");
  const [classReport, setClassReport] = useState<ClassReportRow | null>(null);
  const [classReportLoading, setClassReportLoading] = useState(false);
  const [classBusy, setClassBusy] = useState(false);
  const [classError, setClassError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<QuestionForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);

  const loadAll = useCallback(async () => {
    setLoadingData(true);
    try {
      const [s, qs, rs] = await Promise.all([
        fetchFirstSettings(),
        fetchQuestionsAdmin(),
        fetchResults(),
      ]);
      setSettingsId(s?.id ?? null);
      if (s) {
        setToken(s.token);
        setStatus(s.status);
        setDuration(s.duration_minutes);
      }
      setQuestions(qs);
      setResults(rs);
      setSelectedIds(new Set());
      setNotice(null);
    } catch (err) {
      setNotice({ text: errorMessage(err), ok: false });
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const analysisByResult = useMemo(() => {
    const map = new Map<string, StudentAnalysis | null>();
    for (const r of results) {
      map.set(r.id, parseStudentAnalysis(r.ai_recommendation));
    }
    return map;
  }, [results]);

  const classTokens = useMemo(() => {
    const seen: string[] = [];
    for (const r of results) {
      if (!seen.includes(r.token_used)) seen.push(r.token_used);
    }
    return seen;
  }, [results]);

  const activeClassToken = classToken || classTokens[0] || "";
  const classResults = useMemo(
    () => results.filter((r) => r.token_used === activeClassToken),
    [results, activeClassToken],
  );
  const classOverview = useMemo(
    () => buildClassOverview(classResults),
    [classResults],
  );

  useEffect(() => {
    if (tab !== "teacher" || !activeClassToken) {
      setClassReport(null);
      return;
    }
    let alive = true;
    setClassReportLoading(true);
    setClassError(null);
    void fetchLatestClassReport(activeClassToken)
      .then((row) => {
        if (alive) setClassReport(row);
      })
      .catch((err) => {
        if (alive) setClassError(errorMessage(err));
      })
      .finally(() => {
        if (alive) setClassReportLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tab, activeClassToken]);

  async function generateClassReport() {
    if (!activeClassToken || classResults.length === 0) return;
    setClassBusy(true);
    setClassError(null);
    setNotice(null);
    try {
      const report = await summarizeClass(
        activeClassToken,
        classResults,
        classOverview,
      );
      setClassReport({
        id: "lokal",
        token_used: activeClassToken,
        student_count: classResults.length,
        summary_json: report,
        created_at: new Date().toISOString(),
      });
      try {
        const saved = await saveClassReport(
          activeClassToken,
          classResults.length,
          report,
        );
        setClassReport(saved);
        setNotice({ text: "Ringkasan kelas dibuat dan disimpan.", ok: true });
      } catch (err) {
        setNotice({
          text:
            "Ringkasan tampil, tetapi gagal disimpan: " +
            errorMessage(err) +
            " Jalankan supabase/security-patch.sql lalu coba lagi.",
          ok: false,
        });
      }
    } catch (err) {
      setClassError(errorMessage(err));
    } finally {
      setClassBusy(false);
    }
  }

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    if (!settingsId) return;
    setSavingSettings(true);
    setNotice(null);
    try {
      await updateSettings(settingsId, {
        token: token.trim().toUpperCase(),
        status,
        duration_minutes: duration,
      });
      setNotice({ text: "Pengaturan tersimpan.", ok: true });
      await loadAll();
    } catch (err) {
      setNotice({ text: errorMessage(err), ok: false });
    } finally {
      setSavingSettings(false);
    }
  }

  function openForm(question?: QuestionRow) {
    setFormError(null);
    if (question) {
      setForm({
        id: question.id,
        question_number: question.question_number,
        question_text: question.question_text,
        answer_key: question.answer_key,
        answer_alternatives:
          question.answer_alternatives.length > 0
            ? [...question.answer_alternatives]
            : [""],
        indicator: question.indicator,
      });
    } else {
      const maxNumber = questions.reduce(
        (m, q) => Math.max(m, q.question_number),
        0,
      );
      setForm({ ...EMPTY_FORM, question_number: maxNumber + 1 });
    }
    setFormOpen(true);
  }

  async function saveForm(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.question_text.trim()) {
      setFormError("Teks soal wajib diisi.");
      return;
    }
    if (!form.answer_key.trim()) {
      setFormError("Kunci jawaban wajib diisi.");
      return;
    }

    /* BUG-03: nomor soal wajib unik — ditolak di klien sebelum menyentuh DB
       (indeks unik di security-patch.sql tetap jadi pengaman akhir). */
    if (
      questions.some(
        (q) => q.question_number === form.question_number && q.id !== form.id,
      )
    ) {
      setFormError(
        `Nomor soal ${form.question_number} sudah dipakai soal lain. Pilih nomor lain.`,
      );
      return;
    }

    setSavingQuestion(true);
    try {
      const payload = {
        question_number: form.question_number,
        question_text: form.question_text.trim(),
        answer_key: form.answer_key.trim(),
        answer_alternatives: form.answer_alternatives
          .map((a) => a.trim())
          .filter((a) => a.length > 0),
        indicator: form.indicator.trim() || "Umum",
      };
      if (form.id) {
        await updateQuestion(form.id, payload);
        setNotice({ text: "Soal diperbarui.", ok: true });
      } else {
        await insertQuestion(payload);
        setNotice({ text: "Soal ditambahkan.", ok: true });
      }
      setFormOpen(false);
      await loadAll();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSavingQuestion(false);
    }
  }

  async function removeQuestion(id: string) {
    setNotice(null);
    try {
      await deleteQuestion(id);
      setNotice({ text: "Soal dihapus.", ok: true });
      setDeletingId(null);
      await loadAll();
    } catch (err) {
      setNotice({ text: errorMessage(err), ok: false });
      setDeletingId(null);
    }
  }

  /** Sesi admin diakhiri lewat Supabase Auth: JWT dicabut di server. */
  async function logout() {
    try {
      await supabase.auth.signOut();
    } finally {
      navigate("/", { replace: true });
    }
  }

  function updateAlternative(index: number, value: string) {
    setForm((f) => ({
      ...f,
      answer_alternatives: f.answer_alternatives.map((a, i) =>
        i === index ? value : a,
      ),
    }));
  }

  function addAlternative() {
    setForm((f) => ({
      ...f,
      answer_alternatives: [...f.answer_alternatives, ""],
    }));
  }

  function removeAlternative(index: number) {
    setForm((f) => ({
      ...f,
      answer_alternatives: f.answer_alternatives.filter((_, i) => i !== index),
    }));
  }

  const recap = useMemo(
    () =>
      results.map((r) => ({ ...r, kind: classifyCompletion(r.completion_status) })),
    [results],
  );

  const allSelected =
    recap.length > 0 && recap.every((r) => selectedIds.has(r.id));

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllSelected() {
    setSelectedIds(allSelected ? new Set() : new Set(recap.map((r) => r.id)));
  }

  async function handleExport() {
    setExporting(true);
    setNotice(null);
    try {
      const rowset =
        selectedIds.size > 0
          ? recap.filter((r) => selectedIds.has(r.id))
          : await fetchAllResults();
      if (rowset.length === 0) return;

      await exportResultsToExcel(
        rowset,
        selectedIds.size > 0 ? "terpilih" : "semua",
      );
      setNotice({
        text: `${rowset.length} baris diekspor ke Excel.`,
        ok: true,
      });
    } catch (err) {
      setNotice({ text: errorMessage(err), ok: false });
    } finally {
      setExporting(false);
    }
  }

  async function confirmDeleteResults() {
    if (!deleteMode) return;
    setDeletingResults(true);
    setNotice(null);
    const message =
      deleteMode === "all"
        ? "Seluruh data nilai dihapus."
        : `${selectedIds.size} data nilai dihapus.`;
    try {
      if (deleteMode === "all") {
        await deleteAllResults();
      } else {
        await deleteResults([...selectedIds]);
      }
      setSelectedIds(new Set());
      setDeleteMode(null);
      /* loadAll membersihkan notice, jadi pesan sukses dipasang sesudahnya. */
      await loadAll();
      setNotice({ text: message, ok: true });
    } catch (err) {
      setNotice({ text: errorMessage(err), ok: false });
    } finally {
      setDeletingResults(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-parchment pb-16">
      <AppNavbar
        title="Dashboard"
        badge="Admin"
        actions={
          <button
            type="button"
            onClick={() => void logout()}
            className="press focus-ring inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-caption-strong text-white hover:bg-ink-80 transition-all shadow-xs"
          >
            <LogOut className="size-3.5" />
            <span className="hidden xs:inline">Keluar</span>
          </button>
        }
      />

      <main className="mx-auto max-w-6xl px-5 pt-24 sm:pt-28 sm:px-8">
        {/* Tab switch */}
        <div className="flex flex-wrap gap-3">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={
                  btnPearlClass +
                  " " +
                  (active ? "border-2 border-focus px-[13px]" : "")
                }
              >
                <t.icon className="size-4" strokeWidth={1.5} />
                {t.label}
              </button>
            );
          })}
        </div>

        {notice && (
          <p
            className={
              "text-caption mt-5 rounded-util px-4 py-3 " +
              (notice.ok ? "bg-ok/10 text-ok" : "bg-bad/10 text-bad")
            }
          >
            {notice.text}
          </p>
        )}

        {loadingData ? (
          <div className="flex justify-center py-24">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {tab === "settings" && (
              <section className="mt-8 max-w-xl">
                <Card className="p-6 sm:p-8">
                  <h2 className="text-display-md text-ink">Pengaturan Ujian</h2>
                  <p className="text-caption mt-2 text-ink-48">
                    Token dipakai siswa untuk masuk. Ubahan berlaku seketika
                    untuk pendaftar berikutnya.
                  </p>

                  {settingsId ? (
                    <form onSubmit={saveSettings} className="mt-6 flex flex-col gap-5">
                      <Field label="Token Ujian" hint="Huruf besar, tanpa spasi.">
                        <input
                          className={inputClass + " tracking-widest uppercase"}
                          value={token}
                          onChange={(e) => setToken(e.target.value)}
                        />
                      </Field>

                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <Field label="Status Ujian">
                          <select
                            className={selectClass}
                            value={status}
                            onChange={(e) =>
                              setStatus(e.target.value as "AKTIF" | "TIDAK_AKTIF")
                            }
                          >
                            <option value="AKTIF">AKTIF</option>
                            <option value="TIDAK_AKTIF">TIDAK_AKTIF</option>
                          </select>
                        </Field>
                        <Field label="Durasi (menit)">
                          <input
                            className={selectClass + " rounded-util"}
                            type="number"
                            min={1}
                            max={600}
                            value={duration}
                            onChange={(e) =>
                              setDuration(
                                Math.max(1, Number(e.target.value) || 1),
                              )
                            }
                          />
                        </Field>
                      </div>

                      <Button
                        type="submit"
                        disabled={savingSettings}
                        className="mt-2 w-full sm:w-auto"
                      >
                        {savingSettings ? (
                          <Loader2 className="size-5 animate-spin" />
                        ) : (
                          "Simpan Pengaturan"
                        )}
                      </Button>
                    </form>
                  ) : (
                    <p className="text-caption mt-6 rounded-util bg-warn/10 px-4 py-3 text-warn">
                      Tabel settings kosong. Jalankan supabase/schema.sql di
                      SQL Editor Supabase.
                    </p>
                  )}
                </Card>
              </section>
            )}

            {tab === "bank" && (
              <section className="mt-8">
                <Card className="p-6 sm:p-8">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="text-display-md text-ink">Bank Soal</h2>
                      <p className="text-caption mt-1 text-ink-48">
                        {questions.length} soal aktif. Kunci berupa rumus atau
                        nilai, dengan alternatif jawaban yang diterima.
                      </p>
                    </div>
                    <Button variant="primary" onClick={() => openForm()}>
                      <Plus className="size-4" /> Tambah Soal
                    </Button>
                  </div>

                  <div className="mt-6 flex flex-col">
                    {questions.length === 0 && (
                      <p className="text-caption text-ink-48">
                        Belum ada soal. Klik Tambah Soal untuk memulai.
                      </p>
                    )}
                    {questions.map((q, i) => (
                      <div
                        key={q.id}
                        className={
                          "flex flex-wrap items-center gap-x-4 gap-y-2 py-4 " +
                          (i > 0 ? "border-t border-hairline" : "")
                        }
                      >
                        <span className="text-caption-strong w-8 tabular-nums text-ink-48">
                          {q.question_number}
                        </span>

                        <span className="text-body min-w-0 grow truncate text-ink">
                          {q.question_text}
                        </span>

                        <span className="text-caption rounded-chip bg-pearl px-2.5 py-1 text-ink-80">
                          {q.indicator}
                        </span>
                        <span className="text-caption-strong inline-flex max-w-full items-center gap-1.5 rounded-util border border-hairline px-2.5 py-1 text-primary">
                          Kunci <MathText text={q.answer_key} />
                        </span>

                        <span className="flex gap-1">
                          <button
                            type="button"
                            aria-label="Edit soal"
                            onClick={() => openForm(q)}
                            className="press focus-ring rounded-full p-2 text-ink-48 hover:text-primary"
                          >
                            <Pencil className="size-4" />
                          </button>
                          {deletingId === q.id ? (
                            <>
                              <button
                                type="button"
                                aria-label="Konfirmasi hapus"
                                onClick={() => void removeQuestion(q.id)}
                                className="press focus-ring rounded-full bg-bad/10 px-3 py-1.5 text-caption-strong text-bad"
                              >
                                Ya, Hapus
                              </button>
                              <button
                                type="button"
                                aria-label="Batal hapus"
                                onClick={() => setDeletingId(null)}
                                className="press focus-ring rounded-full p-2 text-ink-48 hover:text-ink"
                              >
                                <X className="size-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              aria-label="Hapus soal"
                              onClick={() => setDeletingId(q.id)}
                              className="press focus-ring rounded-full p-2 text-ink-48 hover:text-bad"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              </section>
            )}

            {tab === "recap" && (
              <section className="mt-8">
                <Card className="p-6 sm:p-8">
                  <h2 className="text-display-md text-ink">Rekap Nilai</h2>
                  <p className="text-caption mt-1 text-ink-48">
                    Daftar menampilkan {recap.length} hasil terbaru (maksimal
                    100). Ekspor tanpa pilihan mencakup seluruh data; dengan
                    pilihan, hanya baris yang dicentang.
                  </p>

                  {recap.length === 0 ? (
                    <p className="text-caption mt-6 text-ink-48">
                      Belum ada siswa yang menyelesaikan ujian.
                    </p>
                  ) : (
                    <>
                      <div className="mt-6 flex flex-wrap items-center gap-2">
                        <Button variant="pearl" onClick={toggleAllSelected}>
                          {allSelected ? "Batalkan pilihan" : "Pilih semua"}
                        </Button>

                        <Button
                          variant="pearl"
                          onClick={() => void handleExport()}
                          disabled={exporting}
                        >
                          {exporting ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Download className="size-4" />
                          )}
                          {selectedIds.size > 0
                            ? `Ekspor ${selectedIds.size} terpilih`
                            : "Ekspor Excel"}
                        </Button>

                        <span className="grow" />

                        <button
                          type="button"
                          disabled={selectedIds.size === 0}
                          onClick={() => setDeleteMode("selected")}
                          className="press focus-ring inline-flex items-center justify-center gap-2 rounded-pill border border-bad/40 px-[18px] py-2 text-caption-strong text-bad hover:bg-bad/5 disabled:pointer-events-none disabled:opacity-35"
                        >
                          <Trash2 className="size-4" />
                          Hapus terpilih ({selectedIds.size})
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteMode("all")}
                          className="press focus-ring inline-flex items-center justify-center gap-2 rounded-pill border border-bad/40 px-[18px] py-2 text-caption-strong text-bad hover:bg-bad/5"
                        >
                          <Trash2 className="size-4" />
                          Hapus semua
                        </button>
                      </div>

                      <div className="mt-5 overflow-x-auto">
                        <table className="w-full min-w-[900px] border-collapse text-left">
                          <thead>
                            <tr>
                              <th className="w-10 border-b border-hairline pb-3 pr-3">
                                <input
                                  type="checkbox"
                                  aria-label="Pilih semua hasil"
                                  checked={allSelected}
                                  onChange={toggleAllSelected}
                                  className="size-4 cursor-pointer accent-black"
                                />
                              </th>
                              {["Nama", "Token", "Nilai", "B/S", "Feedback Murid", "Status", "Waktu"].map(
                                (h) => (
                                  <th
                                    key={h}
                                    className="text-caption-strong border-b border-hairline pb-3 pr-4 text-ink-48"
                                  >
                                    {h}
                                  </th>
                                ),
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {recap.map((r) => (
                              <tr
                                key={r.id}
                                className={
                                  selectedIds.has(r.id) ? "bg-primary/5" : ""
                                }
                              >
                                <td className="border-b border-divider py-4 pr-3">
                                  <input
                                    type="checkbox"
                                    aria-label={`Pilih hasil ${r.student_name}`}
                                    checked={selectedIds.has(r.id)}
                                    onChange={() => toggleSelected(r.id)}
                                    className="size-4 cursor-pointer accent-black"
                                  />
                                </td>
                                <td className="text-body-strong border-b border-divider py-4 pr-4 text-ink">
                                  {r.student_name}
                                </td>
                                <td className="text-caption border-b border-divider py-4 pr-4 tracking-widest text-ink-48">
                                  {r.token_used}
                                </td>
                                <td className="text-body-strong border-b border-divider py-4 pr-4 text-primary tabular-nums">
                                  {formatScore(r.score)}
                                </td>
                                <td className="text-caption border-b border-divider py-4 pr-4 text-ink-48 tabular-nums">
                                  {r.correct_count}/{r.wrong_count}
                                </td>
                                <td className="border-b border-divider py-4 pr-4">
                                  {(() => {
                                    const analysis = analysisByResult.get(r.id) ?? null;
                                    const preview = feedbackPreview(analysis);
                                    if (!preview) {
                                      if (!r.ai_recommendation) {
                                        return (
                                          <span className="inline-flex items-center rounded-pill bg-hairline/60 px-2.5 py-0.5 text-caption text-ink-48">
                                            Belum ada
                                          </span>
                                        );
                                      }
                                      return (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setFeedbackModalTab("student");
                                            setFeedbackRow(r);
                                          }}
                                          className="press inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-caption text-primary hover:bg-primary/10 transition-colors"
                                        >
                                          <MessageSquare className="size-3" />
                                          <span>Lihat feedback</span>
                                        </button>
                                      );
                                    }
                                    return (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setFeedbackModalTab("student");
                                          setFeedbackRow(r);
                                        }}
                                        className="group press flex items-start gap-1.5 text-left max-w-64 rounded-lg p-1.5 -m-1.5 hover:bg-black/5 transition-colors"
                                        title="Klik untuk melihat feedback murid lengkap"
                                      >
                                        <Sparkles className="size-3.5 mt-0.5 shrink-0 text-primary group-hover:scale-110 transition-transform" />
                                        <span className="text-caption line-clamp-2 leading-snug text-ink-80 group-hover:text-primary">
                                          {preview}
                                        </span>
                                      </button>
                                    );
                                  })()}
                                </td>
                                <td className="border-b border-divider py-4 pr-4">
                                  <span
                                    className={
                                      "text-caption-strong rounded-pill px-3 py-1 " +
                                      (r.kind === "done"
                                        ? "bg-ok/10 text-ok"
                                        : r.kind === "timeout"
                                          ? "bg-warn/10 text-warn"
                                          : "bg-bad/10 text-bad")
                                    }
                                  >
                                    {r.completion_status}
                                  </span>
                                </td>
                                <td className="text-caption border-b border-divider py-4 pr-4 text-ink-48">
                                  {formatIdDateTime(r.created_at)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </Card>
              </section>
            )}

            {tab === "teacher" && (
              <section className="mt-8 flex flex-col gap-5">
                <Card className="p-6 sm:p-8">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-display-md text-ink">
                        Ringkasan untuk Guru
                      </h2>
                      <p className="text-caption mt-1 max-w-2xl text-ink-48">
                        Gambaran kelas berdasarkan data asesmen dan analisis
                        langkah siswa. Ringkasan AI adalah alat bantu; keputusan
                        tindak lanjut tetap pada guru.
                      </p>
                    </div>
                    {classTokens.length > 1 && (
                      <label className="flex w-full flex-col gap-1 text-caption text-ink-48 sm:w-56">
                        Sesi ujian (token)
                        <select
                          className={selectClass}
                          value={activeClassToken}
                          onChange={(e) => setClassToken(e.target.value)}
                        >
                          {classTokens.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>

                  {results.length === 0 ? (
                    <p className="text-caption mt-6 text-ink-48">
                      Belum ada data hasil ujian untuk dianalisis.
                    </p>
                  ) : (
                    <>
                      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                          {
                            label: "Siswa",
                            value: String(classOverview.students),
                          },
                          {
                            label: "Rata-rata nilai",
                            value: formatScore(classOverview.averageScore),
                          },
                          {
                            label: "Sudah dianalisis AI",
                            value: `${classOverview.analyzed}/${classOverview.students}`,
                          },
                          {
                            label: "Perlu periksa proses",
                            value: String(classOverview.processChecks),
                          },
                        ].map((stat) => (
                          <div
                            key={stat.label}
                            className="rounded-util border border-hairline bg-pearl p-4"
                          >
                            <p className="text-caption text-ink-48">
                              {stat.label}
                            </p>
                            <p className="text-display-md mt-1 text-ink tabular-nums">
                              {stat.value}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-8">
                        <h3 className="text-body-strong text-ink">
                          Penguasaan indikator kelas
                        </h3>
                        <div className="mt-3 overflow-x-auto">
                          <table className="w-full min-w-[560px] border-collapse text-left">
                            <thead>
                              <tr>
                                {["Indikator", "Benar/Total", "Persentase", "Siswa >=70%", "Status"].map(
                                  (h) => (
                                    <th
                                      key={h}
                                      className="text-caption-strong border-b border-hairline pb-3 pr-4 text-ink-48"
                                    >
                                      {h}
                                    </th>
                                  ),
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {classOverview.indicators.map((i) => {
                                const status = statusFromPercentage(
                                  i.percentage,
                                );
                                return (
                                  <tr key={i.indicator}>
                                    <td className="text-body-strong border-b border-divider py-3 pr-4 text-ink">
                                      {i.indicator}
                                    </td>
                                    <td className="text-caption border-b border-divider py-3 pr-4 text-ink-48 tabular-nums">
                                      {i.correct}/{i.total}
                                    </td>
                                    <td className="text-body-strong border-b border-divider py-3 pr-4 text-primary tabular-nums">
                                      {Math.round(i.percentage)}%
                                    </td>
                                    <td className="text-caption border-b border-divider py-3 pr-4 text-ink-48 tabular-nums">
                                      {i.studentsMastered}/{classOverview.students}
                                    </td>
                                    <td className="border-b border-divider py-3 pr-4">
                                      <span
                                        className={
                                          "text-caption-strong rounded-pill px-3 py-1 " +
                                          (status === "Dikuasai"
                                            ? "bg-ok/10 text-ok"
                                            : status === "Perlu Diperkuat"
                                              ? "bg-warn/10 text-warn"
                                              : "bg-bad/10 text-bad")
                                        }
                                      >
                                        {status}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {classOverview.patterns.length > 0 && (
                        <div className="mt-8">
                          <h3 className="text-body-strong text-ink">
                            Pola kesalahan dari analisis AI
                          </h3>
                          <div className="mt-3 flex flex-col gap-3">
                            {classOverview.patterns.map((p, index) => (
                              <div
                                key={`${p.indikator}-${p.dugaan_jenis_kesalahan}-${index}`}
                                className="rounded-util border border-hairline bg-pearl p-4"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-caption-strong rounded-chip bg-canvas px-2.5 py-1 text-primary">
                                    {p.indikator}
                                  </span>
                                  <span className="text-caption text-ink-48">
                                    dugaan: {p.dugaan_jenis_kesalahan}
                                  </span>
                                  {p.pola_berulang && (
                                    <span className="text-caption-strong rounded-pill bg-warn/10 px-2.5 py-1 text-warn">
                                      Pola berulang
                                    </span>
                                  )}
                                </div>
                                {p.bukti && (
                                  <p className="text-caption mt-2 leading-relaxed text-ink-80">
                                    Bukti: {p.bukti}
                                  </p>
                                )}
                                {p.rekomendasi_tindak_lanjut && (
                                  <p className="text-caption mt-2 leading-relaxed text-ink-48">
                                    Tindak lanjut: {p.rekomendasi_tindak_lanjut}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-8 flex flex-wrap items-center gap-3">
                        <Button
                          variant="primary"
                          disabled={classBusy || classResults.length === 0}
                          onClick={() => void generateClassReport()}
                        >
                          {classBusy ? (
                            <Loader2 className="size-5 animate-spin" />
                          ) : (
                            <Sparkles className="size-4" />
                          )}
                          {classBusy
                            ? "Menyusun ringkasan…"
                            : classReport
                              ? "Buat ulang ringkasan AI"
                              : "Buat ringkasan AI untuk kelas"}
                        </Button>
                        <span className="text-caption text-ink-48">
                          {classResults.length} hasil pada sesi{" "}
                          {activeClassToken || "-"}.
                        </span>
                      </div>

                      {classError && (
                        <p className="text-caption mt-4 rounded-util bg-bad/10 px-4 py-3 text-bad">
                          {classError}
                        </p>
                      )}
                    </>
                  )}
                </Card>

                {classReportLoading && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="size-6 animate-spin text-primary" />
                  </div>
                )}

                {!classReport && !classReportLoading && results.length > 0 && (
                  <Card className="p-6 sm:p-8 border border-dashed border-hairline bg-pearl/50 text-center flex flex-col items-center justify-center">
                    <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                      <GraduationCap className="size-6" />
                    </div>
                    <h3 className="text-display-sm text-ink">
                      AI Belum Menyusun Ringkasan Kelas
                    </h3>
                    <p className="text-caption mt-1.5 max-w-lg text-ink-48">
                      Klik tombol di atas ("Buat ringkasan AI untuk kelas") untuk meminta Agnes AI menganalisis seluruh data langkah siswa, memetakan penguasaan indikator PGL, pola kesalahan kolektif, dan rekomendasi pengajaran.
                    </p>
                  </Card>
                )}

                {classReport && (
                  <Card className="p-6 sm:p-8">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-caption-strong rounded-chip bg-primary/10 px-2.5 py-0.5 text-primary">
                            Ringkasan AI untuk Guru
                          </span>
                          <span className="text-caption text-ink-48">
                            Token {classReport.token_used}
                          </span>
                        </div>
                        <h3 className="text-display-md text-ink mt-1.5">
                          Pemahaman AI terhadap Kelas
                        </h3>
                        <p className="text-caption mt-1 text-ink-48">
                          {classReport.student_count} siswa dianalisis ·{" "}
                          {formatIdDateTime(classReport.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => copyClassReport(classReport)}
                          className="press inline-flex items-center gap-1.5 rounded-pill border border-hairline bg-canvas px-3 py-1.5 text-caption-strong text-ink hover:bg-pearl transition-colors shadow-xs"
                          title="Salin seluruh ringkasan guru"
                        >
                          {copiedClassSummary ? (
                            <>
                              <Check className="size-3.5 text-ok" />
                              <span className="text-ok">Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-3.5 text-ink-48" />
                              <span>Salin Ringkasan Guru</span>
                            </>
                          )}
                        </button>
                        <span className="text-caption-strong rounded-pill bg-primary/10 px-3 py-1 text-primary">
                          Tinjau sebelum dipakai
                        </span>
                      </div>
                    </div>

                    <p className="text-body mt-5 leading-relaxed text-ink-80">
                      {classReport.summary_json.gambaran_umum}
                    </p>

                    {classReport.summary_json.penguasaan_indikator.length > 0 && (
                      <div className="mt-6 flex flex-wrap gap-2">
                        {classReport.summary_json.penguasaan_indikator.map(
                          (i) => (
                            <span
                              key={i.indikator}
                              className={
                                "rounded-util border px-3 py-2 text-caption " +
                                (i.status_kelas === "Dikuasai"
                                  ? "border-ok/30 bg-ok/10 text-ok"
                                  : i.status_kelas === "Perlu Diperkuat"
                                    ? "border-warn/30 bg-warn/10 text-warn"
                                    : "border-bad/30 bg-bad/10 text-bad")
                              }
                            >
                              <strong>{i.indikator}</strong> ·{" "}
                              {Math.round(i.persentase)}%
                            </span>
                          ),
                        )}
                      </div>
                    )}

                    {classReport.summary_json.pola_kesalahan.length > 0 && (
                      <div className="mt-8">
                        <h4 className="text-body-strong text-ink">
                          Pola yang perlu ditindaklanjuti
                        </h4>
                        <div className="mt-3 flex flex-col gap-3">
                          {classReport.summary_json.pola_kesalahan.map(
                            (p, index) => (
                              <div
                                key={`${p.indikator}-${index}`}
                                className="rounded-util border border-hairline bg-pearl p-4"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-caption-strong rounded-chip bg-canvas px-2.5 py-1 text-primary">
                                    {p.indikator}
                                  </span>
                                  <span className="text-caption text-ink-48">
                                    dugaan: {p.dugaan_jenis_kesalahan}
                                  </span>
                                  {p.pola_berulang && (
                                    <span className="text-caption-strong rounded-pill bg-warn/10 px-2.5 py-1 text-warn">
                                      Pola berulang
                                    </span>
                                  )}
                                </div>
                                {p.bukti && (
                                  <p className="text-caption mt-2 leading-relaxed text-ink-80">
                                    Bukti: {p.bukti}
                                  </p>
                                )}
                                {p.rekomendasi_tindak_lanjut && (
                                  <p className="text-caption mt-2 leading-relaxed text-ink-48">
                                    Tindak lanjut: {p.rekomendasi_tindak_lanjut}
                                  </p>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                    {classReport.summary_json.siswa_perlu_perhatian.length > 0 && (
                      <div className="mt-8">
                        <h4 className="text-body-strong text-ink">
                          Siswa yang perlu perhatian
                        </h4>
                        <ul className="mt-3 flex flex-col gap-2">
                          {classReport.summary_json.siswa_perlu_perhatian.map(
                            (s, index) => (
                              <li
                                key={`${s.nama}-${index}`}
                                className="text-caption rounded-util bg-pearl px-4 py-3 leading-relaxed text-ink-80"
                              >
                                <strong className="text-ink">{s.nama}</strong>:{" "}
                                {s.alasan}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}

                    {classReport.summary_json.rekomendasi_pembelajaran.length >
                      0 && (
                      <div className="mt-8">
                        <h4 className="text-body-strong text-ink">
                          Rekomendasi pembelajaran
                        </h4>
                        <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5">
                          {classReport.summary_json.rekomendasi_pembelajaran.map(
                            (r, index) => (
                              <li
                                key={index}
                                className="text-body leading-relaxed text-ink-80"
                              >
                                {r}
                              </li>
                            ),
                          )}
                        </ol>
                      </div>
                    )}

                    {classReport.summary_json.catatan_kehati_hatian && (
                      <p className="text-caption mt-6 rounded-util border border-hairline bg-pearl px-4 py-3 leading-relaxed text-ink-48">
                        Catatan kehati-hatian:{" "}
                        {classReport.summary_json.catatan_kehati_hatian}
                      </p>
                    )}
                  </Card>
                )}
              </section>
            )}
          </>
        )}
      </main>

      {/* Modal tambah/edit soal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)}>
        <h3 className="text-display-md text-ink">
          {form.id ? "Edit Soal" : "Tambah Soal"}
        </h3>

        <form onSubmit={saveForm} className="mt-6 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-5">
            <Field label="Nomor Soal">
              <input
                className={selectClass + " rounded-util"}
                type="number"
                min={1}
                value={form.question_number}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    question_number: Math.max(1, Number(e.target.value) || 1),
                  }))
                }
              />
            </Field>
            <Field label="Indikator Materi">
              <input
                className={selectClass + " rounded-util"}
                value={form.indicator}
                onChange={(e) =>
                  setForm((f) => ({ ...f, indicator: e.target.value }))
                }
                placeholder="Umum"
              />
            </Field>
          </div>

          <Field label="Teks Soal">
            <FractionTextarea
              value={form.question_text}
              onChange={(v) =>
                setForm((f) => ({ ...f, question_text: v }))
              }
              rows={4}
              minHeightClass="min-h-24"
              placeholder="Tulis soal di sini. Gunakan tombol Pecahan untuk menyisipkan bentuk bertumpuk."
            />
          </Field>

          <Field label="Kunci Jawaban (rumus/nilai)">
            <FractionTextarea
              value={form.answer_key}
              onChange={(v) => setForm((f) => ({ ...f, answer_key: v }))}
              rows={4}
              minHeightClass="min-h-24"
              showPreview
              previewLabel="Tampilan kunci"
              placeholder="Misalnya 5/6, 0,5, atau (y2 - y1)/(x2 - x1)"
            />
            <p className="text-caption mt-2 leading-relaxed text-ink-48">
              Bentuk setara seperti 2/4 dan 0,5 otomatis diterima.
              {form.answer_key.trim() &&
                ` Bentuk baku: ${canonicalAnswer(form.answer_key)}.`}
            </p>
          </Field>

          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-caption-strong text-ink-80">
                Alternatif Diterima
              </p>
              <button
                type="button"
                onClick={addAlternative}
                className="press focus-ring inline-flex items-center gap-1 rounded-pill border border-hairline px-3 py-1 text-caption text-primary"
              >
                <Plus className="size-3.5" /> Tambah
              </button>
            </div>
            <p className="text-caption mt-1 text-ink-48">
              Untuk sinonim yang tidak bisa diturunkan, misalnya "lima per enam".
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {form.answer_alternatives.map((alt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className={inputClass}
                    value={alt}
                    onChange={(e) =>
                      updateAlternative(i, normalizeMathText(e.target.value))
                    }
                    placeholder={`Alternatif ${i + 1}`}
                  />
                  <button
                    type="button"
                    aria-label="Hapus alternatif"
                    onClick={() => removeAlternative(i)}
                    className="press focus-ring rounded-full p-2 text-ink-48 hover:text-bad"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {formError && (
            <p className="text-caption rounded-util bg-bad/10 px-4 py-3 text-bad">
              {formError}
            </p>
          )}

          <div className="mt-2 flex flex-col gap-3 sm:flex-row-reverse">
            <Button
              type="submit"
              disabled={savingQuestion}
              className="flex-1"
            >
              {savingQuestion ? (
                <Loader2 className="size-5 animate-spin" />
              ) : form.id ? (
                "Simpan Perubahan"
              ) : (
                "Tambahkan Soal"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setFormOpen(false)}
              className="flex-1"
            >
              Batal
            </Button>
          </div>
        </form>
      </Modal>

      {/* Feedback Murid & Laporan Diagnostik */}
      <Modal
        open={feedbackRow !== null}
        onClose={() => setFeedbackRow(null)}
        maxWidth="max-w-3xl"
      >
        {feedbackRow && (() => {
          const analysis = analysisByResult.get(feedbackRow.id) ?? null;
          return (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-caption-strong rounded-chip bg-primary/10 px-2.5 py-0.5 text-primary">
                      Feedback Murid
                    </span>
                    <span className="text-caption text-ink-48">
                      Token {feedbackRow.token_used}
                    </span>
                  </div>
                  <h3 className="text-display-md text-ink mt-1.5">
                    {feedbackRow.student_name}
                  </h3>
                  <p className="text-caption mt-1 text-ink-48">
                    Nilai:{" "}
                    <strong className="text-primary font-semibold">
                      {formatScore(feedbackRow.score)}
                    </strong>{" "}
                    · Benar: {feedbackRow.correct_count} · Salah:{" "}
                    {feedbackRow.wrong_count} · Total:{" "}
                    {feedbackRow.total_questions} soal ·{" "}
                    {formatIdDateTime(feedbackRow.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyStudentFeedback(feedbackRow)}
                    className="press inline-flex items-center gap-1.5 rounded-pill border border-hairline bg-canvas px-3 py-1.5 text-caption-strong text-ink hover:bg-pearl transition-colors shadow-xs"
                    title="Salin isi feedback untuk dibagikan ke siswa"
                  >
                    {copiedFeedback ? (
                      <>
                        <Check className="size-3.5 text-ok" />
                        <span className="text-ok">Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5 text-ink-48" />
                        <span>Salin Feedback</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {analysis && (
                <div className="mt-4 flex border-b border-hairline gap-4">
                  <button
                    type="button"
                    onClick={() => setFeedbackModalTab("student")}
                    className={
                      "pb-2 text-caption-strong transition-colors border-b-2 -mb-px " +
                      (feedbackModalTab === "student"
                        ? "border-primary text-primary"
                        : "border-transparent text-ink-48 hover:text-ink")
                    }
                  >
                    Umpan Balik untuk Siswa
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackModalTab("diagnostic")}
                    className={
                      "pb-2 text-caption-strong transition-colors border-b-2 -mb-px " +
                      (feedbackModalTab === "diagnostic"
                        ? "border-primary text-primary"
                        : "border-transparent text-ink-48 hover:text-ink")
                    }
                  >
                    Laporan Diagnostik Guru
                  </button>
                </div>
              )}

              <div className="mt-5 max-h-[62vh] overflow-y-auto pr-1">
                {analysis ? (
                  feedbackModalTab === "student" ? (
                    <StudentFeedbackView
                      feedback={analysis.umpan_balik_siswa}
                      tone="light"
                    />
                  ) : (
                    <div className="flex flex-col gap-5 text-ink">
                      {/* Gambaran Umum Guru */}
                      <div className="rounded-util border border-hairline bg-pearl p-4">
                        <p className="text-caption-strong text-primary">
                          Gambaran Umum Diagnostik
                        </p>
                        <p className="text-body mt-2 leading-relaxed text-ink-80">
                          {analysis.laporan_guru.gambaran_umum}
                        </p>
                      </div>

                      {/* Indikator dikuasai & perlu perhatian */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="rounded-util border border-hairline bg-pearl p-4">
                          <p className="text-caption-strong text-ok">
                            Indikator Dikuasai
                          </p>
                          {analysis.laporan_guru.indikator_dikuasai.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {analysis.laporan_guru.indikator_dikuasai.map((ind, i) => (
                                <span
                                  key={i}
                                  className="text-caption rounded-chip bg-ok/10 px-2 py-0.5 text-ok font-medium"
                                >
                                  {ind}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-caption mt-2 text-ink-48">
                              Belum ada indikator yang tuntas.
                            </p>
                          )}
                        </div>

                        <div className="rounded-util border border-hairline bg-pearl p-4">
                          <p className="text-caption-strong text-warn">
                            Indikator Perlu Perhatian
                          </p>
                          {analysis.laporan_guru.indikator_perlu_perhatian.length > 0 ? (
                            <div className="mt-2 flex flex-col gap-2">
                              {analysis.laporan_guru.indikator_perlu_perhatian.map((item, i) => (
                                <div key={i} className="text-caption text-ink-80">
                                  <strong className="text-ink">{item.indikator}</strong> (dugaan: {item.dugaan_jenis_kesalahan})
                                  {item.pola_berulang && (
                                    <span className="ml-1 text-caption-strong text-warn">
                                      [Pola berulang]
                                    </span>
                                  )}
                                  {item.rekomendasi_tindak_lanjut && (
                                    <p className="mt-0.5 text-ink-48 leading-relaxed">
                                      Tindak lanjut: {item.rekomendasi_tindak_lanjut}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-caption mt-2 text-ink-48">
                              Tidak ada indikator bermasalah serius.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Butir yang benar tapi proses perlu diperiksa */}
                      {analysis.laporan_guru.butir_benar_proses_perlu_diperiksa &&
                        analysis.laporan_guru.butir_benar_proses_perlu_diperiksa.length > 0 && (
                          <div className="rounded-util border border-warn/30 bg-warn/10 p-4">
                            <p className="text-caption-strong text-warn flex items-center gap-1.5">
                              <AlertCircle className="size-4" />
                              Butir Benar tetapi Proses Perlu Diperiksa
                            </p>
                            <p className="text-caption mt-1 text-ink-80">
                              Nomor/ID butir:{" "}
                              {analysis.laporan_guru.butir_benar_proses_perlu_diperiksa.join(", ")}
                            </p>
                            <p className="text-caption mt-1 text-ink-48">
                              Jawaban akhir siswa benar, namun langkah pengerjaan atau penalarannya terindikasi belum runtut atau tidak masuk akal.
                            </p>
                          </div>
                        )}

                      {/* Analisis Butir Rinci */}
                      {analysis.analisis_butir && analysis.analisis_butir.length > 0 && (
                        <div>
                          <h4 className="text-body-strong text-ink mb-2">
                            Analisis Langkah per Butir Soal
                          </h4>
                          <div className="flex flex-col gap-2.5">
                            {analysis.analisis_butir.map((b, i) => (
                              <div
                                key={i}
                                className="rounded-util border border-hairline bg-pearl p-3 text-caption leading-relaxed"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-caption-strong text-ink">
                                      Butir {b.id_butir}
                                    </span>
                                    <span className="rounded-chip bg-canvas px-2 py-0.5 text-primary text-caption">
                                      {b.indikator}
                                    </span>
                                  </div>
                                  <span
                                    className={
                                      "rounded-pill px-2.5 py-0.5 text-caption-strong " +
                                      (b.jawaban_akhir === "benar"
                                        ? "bg-ok/10 text-ok"
                                        : "bg-bad/10 text-bad")
                                    }
                                  >
                                    Jawaban: {b.jawaban_akhir}
                                  </span>
                                </div>

                                {b.langkah_pertama_keliru && (
                                  <p className="mt-2 text-ink-80">
                                    <strong className="text-bad">Langkah keliru:</strong>{" "}
                                    {b.langkah_pertama_keliru}
                                  </p>
                                )}

                                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-ink-48">
                                  <span>
                                    Jenis kesalahan:{" "}
                                    <strong className="text-ink">
                                      {b.jenis_kesalahan || "tidak ada"}
                                    </strong>
                                  </span>
                                  {b.catatan_proses && (
                                    <span>
                                      Catatan: <strong className="text-ink">{b.catatan_proses}</strong>
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Catatan kehati-hatian */}
                      {analysis.laporan_guru.catatan_kehati_hatian && (
                        <p className="text-caption rounded-util border border-hairline bg-pearl px-4 py-3 leading-relaxed text-ink-48">
                          Catatan kehati-hatian: {analysis.laporan_guru.catatan_kehati_hatian}
                        </p>
                      )}
                    </div>
                  )
                ) : feedbackRow.ai_recommendation ? (
                  <p className="whitespace-pre-wrap text-body leading-relaxed text-ink-80">
                    {feedbackRow.ai_recommendation}
                  </p>
                ) : (
                  <p className="text-caption text-ink-48">
                    Umpan balik belum tersedia untuk hasil ini.
                  </p>
                )}
              </div>

              <div className="mt-6 flex justify-end border-t border-hairline pt-4">
                <Button variant="pearl" onClick={() => setFeedbackRow(null)}>
                  Tutup
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Konfirmasi hapus data rekap */}
      <Modal
        open={deleteMode !== null}
        onClose={() => {
          if (!deletingResults) setDeleteMode(null);
        }}
      >
        <h3 className="text-display-md text-ink">
          {deleteMode === "all"
            ? "Hapus seluruh data nilai?"
            : `Hapus ${selectedIds.size} data terpilih?`}
        </h3>
        <p className="text-caption mt-3 leading-relaxed text-ink-48">
          {deleteMode === "all"
            ? "Semua hasil ujian akan dihapus permanen, termasuk yang tidak terlihat di layar. Tindakan ini tidak bisa dibatalkan."
            : "Hanya baris yang dicentang yang akan dihapus permanen. Tindakan ini tidak bisa dibatalkan."}
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="button"
            disabled={deletingResults}
            onClick={() => void confirmDeleteResults()}
            className="press focus-ring inline-flex flex-1 items-center justify-center gap-2 rounded-pill bg-bad px-[22px] py-[11px] text-body text-white disabled:pointer-events-none disabled:opacity-40"
          >
            {deletingResults ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              "Ya, Hapus"
            )}
          </button>
          <Button
            variant="ghost"
            disabled={deletingResults}
            onClick={() => setDeleteMode(null)}
            className="flex-1"
          >
            Batal
          </Button>
        </div>
      </Modal>
    </div>
  );
}
