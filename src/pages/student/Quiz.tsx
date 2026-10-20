import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Loader2,
  Repeat,
} from "lucide-react";
import { SubNav, FloatingStickyBar } from "../../components/nav";
import { Button, Modal, PearlChip } from "../../components/ui";
import { useTimer } from "../../hooks/useTimer";
import { useAntiCheat } from "../../hooks/useAntiCheat";
import {
  errorMessage,
  gradeAndSave,
} from "../../lib/supabase";
import {
  ANSWER_LETTERS,
  formatHMS,
  optionText,
} from "../../lib/scoring";
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
  type AnswerLetter,
  type AnswerMap,
  type QuizSession,
} from "../../types";

export default function Quiz() {
  const navigate = useNavigate();

  /* Snapshot sesi: urutan soal sudah diacak saat mulai ujian. */
  const session = useMemo<QuizSession | null>(() => loadSession(), []);
  const questions = useMemo(() => session?.questions ?? [], [session]);

  const [answers, setAnswers] = useState<AnswerMap>(() => loadAnswers());
  const [idx, setIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const idxRef = useRef(idx);
  idxRef.current = idx;
  const submitLock = useRef(false);
  /** Status pengerjaan dikunci dari jalur pertama: retry tidak mengubah
      Waktu Habis / Pelanggaran menjadi SELESAI (RACE-02). */
  const statusRef = useRef<string | null>(null);

  const advanceTimer = useRef<number | null>(null);
  const clearAdvance = useCallback(() => {
    if (advanceTimer.current !== null) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  }, []);

  useEffect(() => {
    if (!session) navigate("/student/entry", { replace: true });
  }, [session, navigate]);

  /* ---------- Pengumpulan jawaban ---------- */

  const doSubmit = useCallback(
    async (status?: string) => {
      if (!session || submitLock.current) return;
      submitLock.current = true;
      clearAdvance();
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
    [session, navigate, clearAdvance],
  );

  const onExpire = useCallback(() => {
    void doSubmit(STATUS_TIMEOUT);
  }, [doSubmit]);
  const remainingMs = useTimer(session?.deadlineMs ?? 0, onExpire);

  const onViolation = useCallback(() => {
    void doSubmit(STATUS_VIOLATION);
  }, [doSubmit]);
  useAntiCheat(onViolation);

  /* ---------- Navigasi & pemilihan jawaban ---------- */

  const handleSelect = useCallback(
    (letter: AnswerLetter) => {
      if (submitLock.current) return;
      const q = questions[idxRef.current];
      if (!q) return;

      setAnswers((prev) => {
        if (prev[q.id] === letter) return prev;
        const next = { ...prev, [q.id]: letter };
        saveAnswers(next);
        return next;
      });

      /* Auto-advance 300 ms, tahan jika pilihan terakhir. */
      clearAdvance();
      if (idxRef.current < questions.length - 1) {
        advanceTimer.current = window.setTimeout(() => {
          setIdx((i) => Math.min(i + 1, questions.length - 1));
        }, 300);
      }
    },
    [questions, clearAdvance],
  );

  const goPrev = useCallback(() => {
    if (submitLock.current) return;
    clearAdvance();
    setIdx((i) => Math.max(0, i - 1));
  }, [clearAdvance]);

  const goNext = useCallback(() => {
    if (submitLock.current) return;
    clearAdvance();
    setIdx((i) => Math.min(questions.length - 1, i + 1));
  }, [questions.length, clearAdvance]);

  /* ---------- Pintasan keyboard (A-E, Enter) ---------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (submitLock.current || !session) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toUpperCase();
      if (/^[A-E]$/.test(key)) {
        e.preventDefault();
        handleSelect(key as AnswerLetter);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (idxRef.current < questions.length - 1) goNext();
        else void doSubmit(STATUS_DONE);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSelect, goNext, doSubmit, questions.length, session]);

  useEffect(() => clearAdvance, [clearAdvance]);

  /* ---------- Render ---------- */

  if (!session || questions.length === 0) return null;

  const current = questions[idx];
  const selected = answers[current.id];
  const isLast = idx === questions.length - 1;
  const remainingText = formatHMS(remainingMs);
  const remainingSec = Math.floor(remainingMs / 1000);
  const timerTone =
    remainingSec <= 60 ? "text-bad" : remainingSec <= 300 ? "text-warn" : "text-ink";

  return (
    <div className="min-h-[100dvh] bg-canvas pb-24">
      <SubNav
        title={session.studentName}
        actions={
          <span
            className={
              "flex items-center gap-2 rounded-pill bg-pearl px-4 py-2 text-caption-strong tabular-nums " +
              timerTone
            }
          >
            <Clock className="size-4" strokeWidth={2} />
            {remainingText}
          </span>
        }
      />

      <main className="mx-auto flex max-w-3xl flex-col px-5 pt-10 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-caption text-ink-48 tabular-nums">
            Soal {idx + 1} dari {questions.length}
          </span>
          <PearlChip>{current.indicator}</PearlChip>
        </div>

        <h2 className="text-tagline mt-6 text-ink">{current.question_text}</h2>

        <div className="mt-8 flex flex-col gap-3">
          {ANSWER_LETTERS.map((letter) => {
            const active = selected === letter;
            return (
              <button
                key={letter}
                type="button"
                onClick={() => handleSelect(letter)}
                aria-pressed={active}
                className={
                  "press focus-ring flex w-full items-center gap-4 rounded-chip border-2 px-5 py-4 text-left " +
                  (active
                    ? "border-focus bg-pearl"
                    : "border-hairline bg-canvas hover:border-chip")
                }
              >
                <span
                  className={
                    "flex size-7 shrink-0 items-center justify-center rounded-full border text-caption-strong " +
                    (active
                      ? "border-focus bg-focus text-white"
                      : "border-hairline bg-pearl text-ink-80")
                  }
                >
                  {letter}
                </span>
                <span className="text-body text-ink">
                  {optionText(current, letter)}
                </span>
              </button>
            );
          })}
        </div>
      </main>

      <FloatingStickyBar>
        <Button variant="pearl" onClick={goPrev} disabled={idx === 0}>
          <ArrowLeft className="size-4" /> Sebelumnya
        </Button>

        <span className="text-caption text-ink-48 tabular-nums">
          {Object.keys(answers).length}/{questions.length} terjawab
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
