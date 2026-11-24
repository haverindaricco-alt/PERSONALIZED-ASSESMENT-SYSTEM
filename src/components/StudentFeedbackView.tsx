import type { StudentFeedback } from "../types";

/** Menampilkan umpan balik terstruktur dari AI. Dipakai di halaman hasil
    siswa (tema gelap) dan modal rekap guru (tema terang). */
export function StudentFeedbackView({
  feedback,
  tone = "dark",
}: {
  feedback: StudentFeedback;
  tone?: "dark" | "light";
}) {
  const dark = tone === "dark";
  const card = dark
    ? "border border-white/10 bg-white/5"
    : "border border-hairline bg-pearl";
  const body = dark ? "text-white/90" : "text-ink";
  const muted = dark ? "text-white/60" : "text-ink-48";
  const label = dark ? "text-link-dark" : "text-primary";
  const chip = dark
    ? "rounded-chip bg-white/10 px-3 py-1 text-caption-strong text-white/80"
    : "rounded-chip bg-canvas px-3 py-1 text-caption-strong text-primary";

  const paragraphs =
    feedback.paragraf && feedback.paragraf.length > 0
      ? feedback.paragraf
      : feedback.ringkasan
        ? feedback.ringkasan
            .split(/\n\s*\n/)
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

  if (paragraphs.length > 0) {
    return (
      <div className="flex flex-col gap-4">
        <article className={"rounded-card p-6 sm:p-7 " + card}>
          <div className="flex items-center gap-2 mb-4">
            <span className={chip}>Umpan Balik Belajar</span>
          </div>

          <div className="flex flex-col gap-4">
            {paragraphs.map((p, index) => (
              <p
                key={index}
                className={"text-body leading-relaxed " + body}
              >
                {p}
              </p>
            ))}
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {feedback.pembuka && (
        <p className={(dark ? "text-lead-airy text-white" : "text-body text-ink")}>
          {feedback.pembuka}
        </p>
      )}

      {(feedback.per_indikator ?? []).map((item, index) => (
        <article key={`${item.indikator}-${index}`} className={"rounded-card p-5 sm:p-6 " + card}>
          <span className={chip}>{item.indikator}</span>

          <div className="mt-4 flex flex-col gap-4">
            {item.yang_sudah_baik && (
              <div>
                <p className={"text-caption-strong " + label}>
                  Yang sudah baik
                </p>
                <p className={"text-body mt-1 " + body}>{item.yang_sudah_baik}</p>
              </div>
            )}

            {item.yang_perlu_diperkuat && (
              <div>
                <p className={"text-caption-strong " + label}>
                  Yang perlu diperkuat
                </p>
                <p className={"text-body mt-1 " + body}>
                  {item.yang_perlu_diperkuat}
                </p>
              </div>
            )}

            {item.kemungkinan_penyebab && (
              <div>
                <p className={"text-caption-strong " + label}>
                  Kemungkinan penyebab
                </p>
                <p className={"text-body mt-1 italic " + muted}>
                  {item.kemungkinan_penyebab}
                </p>
              </div>
            )}

            {item.langkah_perbaikan.filter(Boolean).length > 0 && (
              <div>
                <p className={"text-caption-strong " + label}>
                  Langkah perbaikan
                </p>
                <ol className={"mt-2 flex list-decimal flex-col gap-1.5 pl-5 " + body}>
                  {item.langkah_perbaikan.filter(Boolean).map((step, i) => (
                    <li key={i} className="text-body">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {item.petunjuk && (
              <div
                className={
                  dark
                    ? "rounded-util border border-link-dark/30 bg-link-dark/10 px-4 py-3"
                    : "rounded-util border border-primary/20 bg-primary/5 px-4 py-3"
                }
              >
                <p className={"text-caption-strong " + label}>Pertanyaan penuntun</p>
                <p className={"text-body mt-1 " + body}>{item.petunjuk}</p>
              </div>
            )}
          </div>
        </article>
      ))}

      {feedback.penutup && (
        <p className={"text-body " + muted}>{feedback.penutup}</p>
      )}
    </div>
  );
}
