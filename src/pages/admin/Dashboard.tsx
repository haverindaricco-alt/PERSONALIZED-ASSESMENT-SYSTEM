import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  ClipboardList,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { AppNavbar } from "../../components/nav";
import {
  Button,
  Card,
  Field,
  Modal,
  btnPearlClass,
  inputClass,
  selectClass,
  textareaClass,
} from "../../components/ui";
import { supabase } from "../../lib/supabase";
import {
  deleteQuestion,
  errorMessage,
  fetchFirstSettings,
  fetchQuestionsAdmin,
  fetchResults,
  insertQuestion,
  updateQuestion,
  updateSettings,
} from "../../lib/supabase";
import { canonicalAnswer } from "../../lib/answerFormat";
import { formatIdDateTime, formatScore } from "../../lib/scoring";
import {
  classifyCompletion,
  type QuestionRow,
  type ResultRow,
} from "../../types";

type Tab = "settings" | "bank" | "recap";

const TABS: Array<{ id: Tab; label: string; icon: typeof Settings2 }> = [
  { id: "settings", label: "Pengaturan", icon: Settings2 },
  { id: "bank", label: "Bank Soal", icon: BookOpen },
  { id: "recap", label: "Rekap Nilai", icon: ClipboardList },
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
                        <span className="text-caption-strong rounded-pill border border-hairline px-2.5 py-1 text-primary">
                          Kunci {q.answer_key}
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
                    Membaris waktu nyata: {recap.length} hasil tercatat.
                  </p>

                  {recap.length === 0 ? (
                    <p className="text-caption mt-6 text-ink-48">
                      Belum ada siswa yang menyelesaikan ujian.
                    </p>
                  ) : (
                    <div className="mt-6 overflow-x-auto">
                      <table className="w-full min-w-[640px] border-collapse text-left">
                        <thead>
                          <tr>
                            {["Nama", "Token", "Nilai", "B/S", "Status", "Waktu"].map(
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
                            <tr key={r.id}>
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
                  )}
                </Card>
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
            <textarea
              className={textareaClass + " min-h-24"}
              value={form.question_text}
              onChange={(e) =>
                setForm((f) => ({ ...f, question_text: e.target.value }))
              }
              placeholder="Tulis soal di sini. Pecahan sebagai teks, contoh 1/2."
            />
          </Field>

          <Field label="Kunci Jawaban (rumus/nilai)">
            <textarea
              className={textareaClass + " min-h-24"}
              value={form.answer_key}
              onChange={(e) =>
                setForm((f) => ({ ...f, answer_key: e.target.value }))
              }
              placeholder="Misalnya 5/6 atau 0,5"
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
                    onChange={(e) => updateAlternative(i, e.target.value)}
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
    </div>
  );
}
