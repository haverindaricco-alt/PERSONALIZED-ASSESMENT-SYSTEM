import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Divide,
  Loader2,
  Repeat,
} from "lucide-react";
import { QuizNavbar, FloatingStickyBar } from "../../components/nav";
import { MathText } from "../../components/MathText";
import {
  Button,
  Modal,
  PearlChip,
  textareaClass,
} from "../../components/ui";
import { useTimer } from "../../hooks/useTimer";
import { useAntiCheat } from "../../hooks/useAntiCheat";
import {
  errorMessage,
  gradeAndSave,
} from "../../lib/supabase";
import { formatHMS } from "../../lib/scoring";
import {
  clearQuizBackup,
  loadAnswers,
  loadSession,
  saveAnswers,
} from "../../lib/storage";
import {
  STATUS_DONE,
  STATUS_TIMEOUT,
  STATUS_VIOLATION,
  type AnswerMap,
  type QuizSession,
} from "../../types";

const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉";

/** Ubah pangkat bawah (y₂) menjadi angka biasa (y2) agar penilaian
    teks di database tetap mengenali bentuk yang sama. */
function normalizeMathText(value: string): string {
  return value.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (ch) =>
    String(SUBSCRIPT_DIGITS.indexOf(ch)),
  );
}

export default function Quiz() {
  const navigate = useNavigate();

  /* Snapshot sesi: urutan soal sudah diacak saat mulai ujian. */
  const session = useMemo<QuizSession | null>(() => loadSession(), []);
  const questions = useMemo(() => session?.questions ?? [], [session]);

  const [answers, setAnswers] = useState<AnswerMap>(() => loadAnswers());
  const [idx, setIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /* Alat bantu pecahan: posisi kursor di textarea diingat agar sisipan
     masuk tepat di tempat siswa mengetik. */
  const answerRef = useRef<HTMLTextAreaElement | null>(null);
  const selectionRef = useRef({ start: 0, end: 0 });
  const [fractionOpen, setFractionOpen] = useState(false);
  const [fractionNum, setFractionNum] = useState("");
  const [fractionDen, setFractionDen] = useState("");

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const idxRef = useRef(idx);
  idxRef.current = idx;
  const submitLock = useRef(false);
  /** Status pengerjaan dikunci dari jalur pertama: retry tidak mengubah
      Waktu Habis / Pelanggaran menjadi SELESAI (RACE-02). */
  const statusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!session) navigate("/student/entry", { replace: true });
  }, [session, navigate]);

  /* ---------- Pengumpulan jawaban ---------- */

  const doSubmit = useCallback(
    async (status?: string) => {
      if (!session || submitLock.current) return;
      submitLock.current = true;
      setSubmitting(true);

      try {
        if (!statusRef.current) statusRef.current = status ?? STATUS_DONE;
        /* Grading di server: hasil tersimpan cepat (< 1 s), kunci
           jawaban tidak pernah dikirim ke browser, dan rekomendasi
           Agnes menyusul di halaman hasil (RACE-01). */
        const row = await gradeAndSave({
          token: session.token,
          student: session.studentName,
          answers: answersRef.current,
          status: statusRef.current,
        });

        clearQuizBackup();
        navigate(
          `/student/result?id=${row.id}&t=${encodeURIComponent(session.token)}`,
          { state: { row }, replace: true },
        );
      } catch (err) {
        submitLock.current = false;
        setSubmitting(false);
        setSubmitError(errorMessage(err));
      }
    },
    [session, navigate],
  );

  const onExpire = useCallback(() => {
    void doSubmit(STATUS_TIMEOUT);
  }, [doSubmit]);
  const remainingMs = useTimer(session?.deadlineMs ?? 0, onExpire);

  const onViolation = useCallback(() => {
    void doSubmit(STATUS_VIOLATION);
  }, [doSubmit]);
  useAntiCheat(onViolation);

  /* ---------- Navigasi & pengisian jawaban ---------- */

  const handleChange = useCallback(
    (text: string) => {
      if (submitLock.current) return;
      const q = questions[idxRef.current];
      if (!q) return;

      setAnswers((prev) => {
        if (prev[q.id] === text) return prev;
        const next = { ...prev, [q.id]: text };
        saveAnswers(next);
        return next;
      });
    },
    [questions],
  );

  const rememberSelection = useCallback(() => {
    const el = answerRef.current;
    if (!el) return;
    selectionRef.current = { start: el.selectionStart, end: el.selectionEnd };
  }, []);

  /* Panel pecahan tidak terbawa saat siswa pindah soal. */
  useEffect(() => {
    setFractionOpen(false);
    setFractionNum("");
    setFractionDen("");
  }, [idx]);

  const goPrev = useCallback(() => {
    if (submitLock.current) return;
    setIdx((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    if (submitLock.current) return;
    setIdx((i) => Math.min(questions.length - 1, i + 1));
  }, [questions.length]);

  /* ---------- Pintasan keyboard (Enter / Ctrl+Enter) ---------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (submitLock.current || !session || submitError !== null) return;
      if (e.key !== "Enter" || e.altKey) return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const inAnswer = tag === "TEXTAREA";
      const withModifier = e.ctrlKey || e.metaKey;

      /* Di textarea, Enter biasa berarti baris baru. Ctrl+Enter tetap
         dipakai untuk lanjut, dan tidak mengganggu input lain. */
      if (inAnswer && !withModifier) return;
      if (!inAnswer && !withModifier && tag !== "BODY") return;

      e.preventDefault();
      if (idxRef.current < questions.length - 1) goNext();
      else void doSubmit(STATUS_DONE);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, doSubmit, questions.length, session, submitError]);

  /* ---------- Render ---------- */

  if (!session || questions.length === 0) return null;

  const current = questions[idx];
  const answerText = answers[current.id] ?? "";
  const sessionIds = new Set(questions.map((q) => q.id));
  const answeredCount = Object.entries(answers).filter(
    ([id, value]) => sessionIds.has(id) && value.trim().length > 0,
  ).length;
  const fractionNumValue = fractionNum.trim();
  const fractionDenValue = fractionDen.trim();
  const denominatorIsZero = /^[+-]?0+(?:[.,]0+)?$/.test(fractionDenValue);
  const fractionValid =
    fractionNumValue.length > 0 &&
    fractionDenValue.length > 0 &&
    !denominatorIsZero;

  function insertFraction() {
    if (!fractionValid) return;

    /* Token tunggal (5, y2, -1) tidak perlu tanda kurung agar pecahan
       angka tetap dikenali sebagai nilai oleh canonical_answer. Ekspresi
       seperti y2 - y1 dibungkus agar batas pembilang/penyebut jelas. */
    const atomicNum =
      /^[A-Za-z0-9]+$/.test(fractionNumValue) ||
      /^[+-]?\d+$/.test(fractionNumValue);
    const atomicDen =
      /^[A-Za-z0-9]+$/.test(fractionDenValue) ||
      /^[+-]?\d+$/.test(fractionDenValue);
    const token =
      atomicNum && atomicDen
        ? `${fractionNumValue}/${fractionDenValue}`
        : `(${fractionNumValue})/(${fractionDenValue})`;

    const { start, end } = selectionRef.current;
    const next = answerText.slice(0, start) + token + answerText.slice(end);
    handleChange(next);
    setFractionOpen(false);
    setFractionNum("");
    setFractionDen("");
    requestAnimationFrame(() => {
      const el = answerRef.current;
      if (!el) return;
      const pos = start + token.length;
      el.focus();
      el.setSelectionRange(pos, pos);
      selectionRef.current = { start: pos, end: pos };
    });
  }

  const isLast = idx === questions.length - 1;
  const remainingText = formatHMS(remainingMs);
  const remainingSec = Math.floor(remainingMs / 1000);
  const timerTone =
    remainingSec <= 60
      ? "bg-bad/10 text-bad border border-bad/30 font-bold animate-pulse"
      : remainingSec <= 300
        ? "bg-warn/10 text-warn border border-warn/30 font-medium"
        : "bg-pearl text-ink border border-hairline";

  return (
    <div className="min-h-[100dvh] bg-canvas pb-24">
      <QuizNavbar
        studentName={session.studentName}
        remainingText={remainingText}
        timerTone={timerTone}
        questionProgress={{ current: idx + 1, total: questions.length }}
      />

      <main className="mx-auto flex max-w-3xl flex-col px-5 pt-24 sm:pt-28 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-caption text-ink-48 tabular-nums">
            Soal {idx + 1} dari {questions.length}
          </span>
          <PearlChip>{current.indicator}</PearlChip>
        </div>

        <h2 className="text-tagline mt-6 text-ink">{current.question_text}</h2>

        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label
              htmlFor="quiz-answer"
              className="text-caption-strong text-ink-80"
            >
              Jawaban Anda
            </label>
            <button
              type="button"
              aria-expanded={fractionOpen}
              onClick={() => setFractionOpen((open) => !open)}
              className="press focus-ring inline-flex items-center gap-1.5 rounded-pill border border-hairline bg-canvas px-3 py-1.5 text-caption-strong text-primary hover:bg-pearl"
            >
              <Divide className="size-4" />
              Pecahan
            </button>
          </div>

          <textarea
            id="quiz-answer"
            ref={answerRef}
            rows={5}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={answerText}
            onChange={(e) => handleChange(normalizeMathText(e.target.value))}
            onFocus={rememberSelection}
            onSelect={rememberSelection}
            onKeyUp={rememberSelection}
            onClick={rememberSelection}
            placeholder="Tulis jawaban akhir. Untuk pecahan, ketik 5/6 atau gunakan tombol Pecahan."
            className={textareaClass + " mt-3 min-h-32 resize-y"}
          />

          {answerText.trim() && (
            <div className="mt-3 rounded-util border border-hairline bg-pearl p-4">
              <p className="text-caption-strong text-ink">
                Tampilan jawaban
              </p>
              <div className="mt-3 rounded-util border border-hairline bg-canvas px-4 py-3 text-body text-ink">
                <MathText text={answerText} />
              </div>
            </div>
          )}

          {fractionOpen && (
            <div className="mt-3 rounded-util border border-hairline bg-pearl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-caption-strong text-ink">
                    Sisipkan pecahan
                  </p>
                  <p className="text-caption mt-1 text-ink-48">
                    Boleh angka, huruf, dan operasi. Contoh: y2 - y1.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFractionOpen(false)}
                  className="press focus-ring rounded-pill px-2 py-1 text-caption text-ink-48 hover:text-ink"
                >
                  Tutup
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-caption text-ink-48">
                  Pembilang
                  <input
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    value={fractionNum}
                    onChange={(e) =>
                      setFractionNum(normalizeMathText(e.target.value))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        insertFraction();
                      }
                    }}
                    className="focus-ring h-10 w-40 rounded-util border border-hairline bg-canvas px-3 text-body text-ink placeholder:text-ink-48"
                  />
                </label>

                <span className="pb-2 text-body text-ink-48">/</span>

                <label className="flex flex-col gap-1 text-caption text-ink-48">
                  Penyebut
                  <input
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    value={fractionDen}
                    onChange={(e) =>
                      setFractionDen(normalizeMathText(e.target.value))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        insertFraction();
                      }
                    }}
                    className="focus-ring h-10 w-40 rounded-util border border-hairline bg-canvas px-3 text-body text-ink placeholder:text-ink-48"
                  />
                </label>

                <button
                  type="button"
                  disabled={!fractionValid}
                  onClick={insertFraction}
                  className="press focus-ring h-10 rounded-pill bg-ink px-4 text-caption-strong text-white hover:bg-ink-80 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sisipkan
                </button>
              </div>

              {(fractionNumValue || fractionDenValue) && !fractionValid && (
                <p className="text-caption mt-2 text-bad">
                  Pembilang dan penyebut wajib diisi, dan penyebut tidak boleh
                  0.
                </p>
              )}
            </div>
          )}

          <p className="text-caption mt-3 leading-relaxed text-ink-48">
            Spasi dan huruf besar tidak dibedakan. Bentuk setara seperti 2/4
            dan 1/2 dianggap sama. Enter membuat baris baru; Ctrl+Enter untuk
            lanjut ke soal berikutnya.
          </p>
        </div>
      </main>

      <FloatingStickyBar>
        <Button variant="pearl" onClick={goPrev} disabled={idx === 0}>
          <ArrowLeft className="size-4" /> Sebelumnya
        </Button>

        <span className="text-caption text-ink-48 tabular-nums">
          {answeredCount}/{questions.length} terjawab
        </span>

        {isLast ? (
          <Button variant="primary" onClick={() => void doSubmit(STATUS_DONE)}>
            Selesai & Kumpulkan
          </Button>
        ) : (
          <Button variant="primary" onClick={goNext}>
            Selanjutnya <ArrowRight className="size-4" />
          </Button>
        )}
      </FloatingStickyBar>

      {/* Overlay penyimpanan hasil & rekomendasi AI */}
      <Modal open={submitting} onClose={() => {}} dismissable={false}>
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-body-strong text-ink">Memproses hasil ujian</p>
          <p className="text-caption text-ink-48">
            Jawabanmu sedang dinilai di server. Rekomendasi belajar dari
            Agnes AI akan menyusul di halaman hasil.
          </p>
        </div>
      </Modal>

      {/* Gagal menyimpan: coba lagi */}
      <Modal open={submitError !== null} onClose={() => setSubmitError(null)}>
        <div className="py-2">
          <p className="text-body-strong text-ink">Gagal mengirim jawaban</p>
          <p className="text-caption mt-2 text-ink-48">{submitError}</p>
          <p className="text-caption mt-4 text-ink-48">
            Jawabanmu tetap tersimpan di perangkat, jangan khawatir. Periksa
            koneksi, lalu coba kirim lagi.
          </p>
          <div className="mt-6 flex gap-3">
            <Button variant="primary" onClick={() => void doSubmit()} className="flex-1">
              <Repeat className="size-4" /> Coba Lagi
            </Button>
            <Button variant="ghost" onClick={() => setSubmitError(null)} className="flex-1">
              Nanti
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
