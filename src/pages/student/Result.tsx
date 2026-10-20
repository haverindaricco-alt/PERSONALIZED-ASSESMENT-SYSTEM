import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Bot, Check, X, TimerOff } from "lucide-react";
import { Card, IndicatorBar, Reveal } from "../../components/ui";
import { GlobalNav } from "../../components/nav";
import {
  ensureSupabaseConfigured,
  errorMessage,
  fetchQuestionMap,
  fetchResultById,
} from "../../lib/supabase";
import { formatIdDateTime, formatScore, optionText } from "../../lib/scoring";
import {
  classifyCompletion,
  type AnswerLetter,
  type QuestionRow,
  type ResultRow,
} from "../../types";

const btnPrimaryLink =
  "press focus-ring inline-flex items-center justify-center rounded-pill bg-primary px-[22px] py-[11px] text-body text-white";

export default function Result() {  const [params] = useSearchParams();
  const id = params.get("id");

  const [result, setResult] = useState<ResultRow | null>(null);
  const [questionMap, setQuestionMap] = useState<Map<string, QuestionRow>>(
    () => new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!id) {
        setError(
          "Tidak ada hasil ujian yang ditunjuk. Mulai ujian terlebih dahulu.",
        );
        setLoading(false);
        return;
      }
      try {
        ensureSupabaseConfigured();
        const row = await fetchResultById(id);
        const qm = await fetchQuestionMap();
        if (!alive) return;
        if (!row) {
          setError("Hasil ujian tidak ditemukan.");
        } else {
          setResult(row);
          setQuestionMap(qm);
        }
      } catch (err) {
        if (alive) setError(errorMessage(err));
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-canvas">
        <GlobalNav brand="Personalized Assessment" />
        <div className="flex flex-col items-center justify-center py-40">
          <div className="h-40 w-72 animate-pulse rounded-card bg-parchment" />
          <div className="mt-8 h-4 w-56 animate-pulse rounded-pill bg-parchment" />
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-[100dvh] bg-canvas">
        <GlobalNav brand="Personalized Assessment" />
        <div className="mx-auto flex max-w-md flex-col items-center px-6 py-40 text-center">
          <p className="text-body-strong text-ink">
            {error ?? "Hasil tidak ditemukan."}
          </p>
          <Link to="/" className={btnPrimaryLink + " mt-8"}>
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  const summary = result.indicator_summary_json ?? [];
  const kind = classifyCompletion(result.completion_status);
  const recParts = buildRecommendationParts(result.ai_recommendation ?? "");

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <GlobalNav brand="Personalized Assessment" />

      {/* Tile gelap: skor utama */}
      <section className="bg-tile-1 px-6 pb-14 pt-16 text-center sm:px-8">
        <p className="text-caption-strong text-white/60">
          Hasil Ujian {formatIdDateTime(result.created_at)}
        </p>
        <h1 className="text-display-lg mt-2 text-white">{result.student_name}</h1>

        <span
          className={
            "mt-4 inline-flex items-center gap-2 rounded-pill px-4 py-1.5 text-caption-strong " +
            (kind === "done"
              ? "bg-ok/15 text-ok"
              : kind === "timeout"
                ? "bg-warn/15 text-warn"
                : "bg-bad/15 text-bad")
          }
        >
          {kind === "done" ? (
            <Check className="size-4" />
          ) : kind === "timeout" ? (
            <TimerOff className="size-4" />
          ) : (
            <X className="size-4" />
          )}
          {result.completion_status}
        </span>

        <p className="text-hero-display mt-8 text-white tabular-nums">
          {formatScore(result.score)}
        </p>
        <p className="text-caption mt-1 text-muted-dark">
          Nilai skala 100 dari {result.total_questions} soal
        </p>

        <div className="mx-auto mt-8 grid max-w-md grid-cols-2 gap-4">
          <Card className="product-shadow p-5">
            <div className="flex items-center gap-1.5">
              <Check className="size-4 text-ok" />
              <p className="text-caption text-ink-48">Jawaban Benar</p>
            </div>
            <p className="text-display-lg mt-1 text-ok tabular-nums">
              {result.correct_count}
            </p>
          </Card>
          <Card className="product-shadow p-5">
            <div className="flex items-center gap-1.5">
              <X className="size-4 text-bad" />
              <p className="text-caption text-ink-48">Jawaban Salah</p>
            </div>
            <p className="text-display-lg mt-1 text-bad tabular-nums">
              {result.wrong_count}
            </p>
          </Card>
        </div>
      </section>

      {/* Tile putih: peta penguasaan indikator */}
      <section className="px-6 py-16 sm:px-8">
        <Reveal className="mx-auto max-w-2xl">
          <h2 className="text-display-md text-ink">Peta Penguasaan Indikator</h2>
          <p className="text-caption mt-2 text-ink-48">
            Hijau 75% ke atas, kuning 50 sampai 74%, merah di bawah 50%.
          </p>
          <div className="mt-8 flex flex-col gap-6">
            {summary.length === 0 ? (
              <p className="text-caption text-ink-48">
                Ringkasan indikator tidak tersedia untuk hasil ini.
              </p>
            ) : (
              summary.map((item) => (
                <IndicatorBar key={item.indicator} item={item} />
              ))
            )}
          </div>
        </Reveal>
      </section>

      {/* Tile gelap: rekomendasi Agnes AI */}
      <section className="bg-tile-2 px-6 py-16 sm:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-white/10">
              <Bot className="size-5 text-link-dark" strokeWidth={1.5} />
            </span>
            <div>
              <p className="text-body-strong text-white">
                Rekomendasi Belajar
              </p>
              <p className="text-caption text-muted-dark">
                Dihasilkan otomatis oleh Agnes AI (agnes-2.5-flash)
              </p>
            </div>
          </div>

          <Reveal delay={100}>
            {recParts.length === 0 ? (
              <p className="text-lead-airy mt-8 text-white">
                Rekomendasi belum tersedia untuk hasil ini.
              </p>
            ) : (
              <div className="mt-8 flex flex-col gap-4">
                {recParts.map((part, i) => (
                  <RecommendationRow key={i} part={part} />
                ))}
              </div>
            )}
          </Reveal>
        </div>
      </section>

      {/* Tile putih: tinjauan jawaban */}
      <section className="px-6 py-16 sm:px-8">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <h2 className="text-display-md text-ink">Tinjauan Jawaban</h2>
          </Reveal>

          <div className="mt-8 flex flex-col">
            {buildReviewRows(result, questionMap).map((row) => (
              <div
                key={row.number}
                className={"py-6 border-t border-hairline"}
              >
                <div className="flex items-start gap-4">
                  <span className="text-caption-strong mt-1 w-6 shrink-0 text-ink-48 tabular-nums">
                    {row.number}
                  </span>
                  <div className="grow">
                    <p className="text-body text-ink">{row.text}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1">
                      <span
                        className={
                          "rounded-pill px-3 py-1 text-caption-strong " +
                          (row.isCorrect
                            ? "bg-ok/10 text-ok"
                            : "bg-bad/10 text-bad")
                        }
                      >
                        {row.isCorrect ? "Benar" : "Salah"}
                      </span>
                      <p className="text-caption text-ink-48">
                        Jawabanmu:{" "}
                        <span
                          className={row.isCorrect ? "text-ok" : "text-bad"}
                        >
                          {row.yourAnswer}
                        </span>
                      </p>
                      {!row.isCorrect && (
                        <p className="text-caption text-ink-48">
                          Kunci: <span className="text-ink">{row.key}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex">
            <Link to="/" className={btnPrimaryLink}>
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------- Render rekomendasi ---------- */

/**
 * Satu baris rekomendasi dipetakan ke tiga bentuk tampilan:
 * - "panel": bagian naratif (Kekuatan/Fokus) dengan chip label di atas
 * - "step":  langkah aksi (Langkah 1-3 atau "1)" legacy) dengan nomor lingkar
 * - "prose": teks bebas gaya lama, dirender apa adanya
 */
interface RecPart {
  kind: "panel" | "step" | "prose";
  label?: string;
  step?: number;
  text: string;
}

const LABELED_LINE_RE = /^(Kekuatan|Fokus|Langkah ([1-3])):\s*(.*)$/;
const LEGACY_STEP_RE = /^([1-3])\)\s*(.*)$/;

function buildRecommendationParts(model: string): RecPart[] {
  const parts: RecPart[] = [];
  for (const line of model.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const labeled = LABELED_LINE_RE.exec(trimmed);
    if (labeled) {
      parts.push({
        kind: labeled[1] === "Kekuatan" || labeled[1] === "Fokus" ? "panel" : "step",
        label: labeled[1],
        step: labeled[2] ? Number(labeled[2]) : undefined,
        text: labeled[3].trim(),
      });
      continue;
    }
    const legacy = LEGACY_STEP_RE.exec(trimmed);
    if (legacy) {
      parts.push({ kind: "step", step: Number(legacy[1]), text: legacy[2].trim() });
      continue;
    }
    parts.push({ kind: "prose", text: trimmed });
  }
  return parts;
}

const chipLabelClass =
  "inline-flex items-center rounded-chip bg-white/10 px-3.5 py-1.5 text-caption-strong text-white/80";

function RecommendationRow({ part }: { part: RecPart }) {
  if (!part.text) return null;

  if (part.kind === "panel") {
    return (
      <div className="rounded-card border border-white/10 bg-white/5 p-5 sm:p-6">
        <span className={chipLabelClass}>{part.label}</span>
        <p className="text-body mt-3 text-white/90">{part.text}</p>
      </div>
    );
  }

  if (part.kind === "step") {
    return (
      <div className="flex items-start gap-4 rounded-card border border-white/10 bg-white/5 p-5 sm:p-6 sm:gap-5">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-caption-strong text-link-dark tabular-nums">
          {part.step ?? ""}
        </span>
        <p className="text-body text-white/90">{part.text}</p>
      </div>
    );
  }

  return <p className="text-lead-airy text-white">{part.text}</p>;
}

/* ---------- Utilitas tinjauan ---------- */

interface ReviewRow {
  number: number;
  text: string;
  isCorrect: boolean;
  yourAnswer: string;
  key: AnswerLetter;
}

function buildReviewRows(
  result: ResultRow,
  questionMap: Map<string, QuestionRow>,
): ReviewRow[] {
  // Baris tinjauan membaca map soal dari Peta Jawaban JSONB.
  const answerMap = result.answers_json ?? {};
  const rows: ReviewRow[] = [];

  for (const [qid, letter] of Object.entries(answerMap)) {
    const q = questionMap.get(qid);
    if (!q) continue;
    const isCorrect = letter === q.correct_answer;
    rows.push({
      number: q.question_number,
      text: q.question_text,
      isCorrect,
      yourAnswer: `${letter}) ${optionText(q, letter as AnswerLetter)}`,
      key: q.correct_answer,
    });
  }

  /* Tampilkan nomor soal asli, bukan urutan acak saat ujian. */
  return rows.sort((a, b) => a.number - b.number);
}
