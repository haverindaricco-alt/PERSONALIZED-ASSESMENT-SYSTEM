import { useState, useEffect, useRef, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Keyboard, Loader2, Lock, Save, ShieldAlert, Timer } from "lucide-react";
import {
  Button,
  Card,
  Field,
  Modal,
  inputClass,
} from "../../components/ui";
import { MinimalNav } from "../../components/nav";
import {
  ensureSupabaseConfigured,
  errorMessage,
  fetchSettingsByToken,
  fetchStudentQuestions,
} from "../../lib/supabase";
import { fisherYates } from "../../lib/scoring";
import { saveSession } from "../../lib/storage";
import type { StudentQuestion, SettingsRow } from "../../types";

interface PendingStart {
  settings: SettingsRow;
  questions: StudentQuestion[];
  studentName: string;
}

const RULES = [
  {
    icon: Timer,
    title: "Waktu terbatas",
    body: "Sisa waktu dihitung mundur. Jika habis, jawabanmu dikumpulkan otomatis.",
  },
  {
    icon: Keyboard,
    title: "Pintasan keyboard",
    body: "Ketik jawaban akhir pada kolom isian. Huruf besar dan spasi tidak dibedakan. Gunakan tombol Pecahan untuk menyisipkan pembilang/penyebut. Enter membuat baris baru, Ctrl+Enter melaju ke soal berikutnya.",
  },
  {
    icon: ShieldAlert,
    title: "Focus Lock",
    body: "Pindah tab atau keluar dari halaman akan menghentikan ujian secara paksa dengan status DIHENTIKAN.",
  },
  {
    icon: Save,
    title: "Backup otomatis",
    body: "Jawabanmu tersimpan di perangkat ini, aman saat halaman tidak sengaja ter-refresh.",
  },
];

export default function Entry() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingStart | null>(null);
  const [starting, setStarting] = useState(false);
  const [ruleStep, setRuleStep] = useState(0);
  /** Backoff percobaan token (SEC-07): setelah 3 gagal, berhenti 10 detik. */
  const attemptRef = useRef(0);
  const [lockUntil, setLockUntil] = useState(0);
  const [, tick] = useState(0);

  /* Navigasi keyboard slider aturan ketika modal terbuka */
  useEffect(() => {
    if (!pending) {
      setRuleStep(0);
      return;
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        setRuleStep((prev) => Math.min(RULES.length - 1, prev + 1));
      } else if (e.key === "ArrowLeft") {
        setRuleStep((prev) => Math.max(0, prev - 1));
      } else if (e.key === "Enter" && !starting) {
        if (ruleStep < RULES.length - 1) {
          setRuleStep((prev) => prev + 1);
        } else {
          void startExam();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pending, ruleStep, starting]);

  useEffect(() => {
    if (lockUntil <= Date.now()) return;
    const interval = window.setInterval(() => {
      tick((c) => c + 1);
      if (Date.now() >= lockUntil) {
        window.clearInterval(interval);
        setLockUntil(0);
      }
    }, 250);
    return () => window.clearInterval(interval);
  }, [lockUntil]);

  const locked = Date.now() < lockUntil;

  async function validateAndPrepare(e: FormEvent) {
    e.preventDefault();
    if (checking || locked) return; /*hindari double fetch (RACE-04) */
    setError(null);

    const cleanName = name.trim().replace(/\s+/g, " ");
    const tokenUpper = token.trim().toUpperCase();
    if (cleanName.length < 2) {
      setError("Tulis nama lengkap minimal 2 karakter.");
      return;
    }
    if (!tokenUpper) {
      setError("Token ujian wajib diisi.");
      return;
    }

    setChecking(true);
    try {
      ensureSupabaseConfigured();
      const [settings, questions] = await Promise.all([
        fetchSettingsByToken(tokenUpper),
        fetchStudentQuestions(),
      ]);

      if (settings.status !== "AKTIF") {
        throw new Error("Ujian dengan token ini sedang tidak aktif.");
      }
      if (settings.duration_minutes < 1) {
        throw new Error("Durasi ujian belum diatur oleh pengawas.");
      }
      if (questions.length === 0) {
        throw new Error("Bank soal masih kosong. Hubungi pengawas.");
      }

      attemptRef.current = 0;
      setPending({ settings, questions, studentName: cleanName });
    } catch (err) {
      attemptRef.current += 1;
      if (attemptRef.current >= 3) setLockUntil(Date.now() + 10_000);
      setError(errorMessage(err));
    } finally {
      setChecking(false);
    }
  }

  function startExam() {
    if (!pending) return;
    setStarting(true);
    const shuffled = fisherYates(pending.questions);
    saveSession({
      studentName: pending.studentName,
      token: pending.settings.token,
      durationMinutes: pending.settings.duration_minutes,
      deadlineMs: Date.now() + pending.settings.duration_minutes * 60_000,
      questions: shuffled,
    });
    navigate("/student/quiz", { replace: true });
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-parchment px-4 py-20">
      <MinimalNav />
      <Card className="w-full max-w-md p-6 sm:p-8 mt-6">
        <h1 className="text-display-md text-ink">Masuk Ujian</h1>
        <p className="text-caption mt-2 text-ink-48">
          Nama dan token dibagikan oleh pengawas ujian.
        </p>

        <form onSubmit={validateAndPrepare} className="mt-6 flex flex-col gap-5">
          <Field label="Nama Lengkap">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sesuai presensi"
              autoComplete="off"
            />
          </Field>

          <Field label="Token Ujian">
            <input
              className={inputClass + " tracking-widest uppercase"}
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setError(null);
              }}
              placeholder="XXXX0000"
              autoComplete="off"
              spellCheck={false}
            />
          </Field>

          {error && (
            <p className="text-caption rounded-util bg-bad/10 px-4 py-3 leading-relaxed text-bad">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            disabled={checking || locked}
            className="w-full"
          >
            {checking ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              "Periksa Token"
            )}
          </Button>
        </form>
      </Card>

      {/* Modal konfirmasi aturan sebelum mulai (Compact Step-by-Step Slider) */}
      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        dismissable={!starting}
        maxWidth="max-w-md"
        title="Aturan & Proteksi Ujian"
        subtitle={
          pending && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-pearl border border-hairline px-2.5 py-0.5 text-[11px] font-medium text-ink-80">
                <Timer className="size-3 text-primary" />
                {pending.settings.duration_minutes} menit
              </span>
              <span className="inline-flex items-center rounded-full bg-pearl border border-hairline px-2.5 py-0.5 text-[11px] font-medium text-ink-80">
                {pending.questions.length} soal
              </span>
              <span className="inline-flex items-center rounded-full bg-pearl border border-hairline px-2.5 py-0.5 text-[11px] font-mono font-medium text-primary tracking-wider">
                {pending.settings.token}
              </span>
            </div>
          )
        }
        footer={
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-3">
              {ruleStep === 0 ? (
                <Button
                  variant="ghost"
                  onClick={() => setPending(null)}
                  disabled={starting}
                  className="flex-1 sm:flex-initial"
                >
                  Batal
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => setRuleStep((prev) => prev - 1)}
                  disabled={starting}
                  className="flex-1 sm:flex-initial"
                >
                  &larr; Kembali
                </Button>
              )}

              {ruleStep < RULES.length - 1 ? (
                <Button
                  variant="primary"
                  onClick={() => setRuleStep((prev) => prev + 1)}
                  disabled={starting}
                  className="flex-1 sm:flex-initial"
                >
                  Lanjut &rarr;
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={startExam}
                  disabled={starting}
                  className="flex-1 sm:flex-initial"
                >
                  {starting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" /> Menyiapkan…
                    </span>
                  ) : (
                    "Saya Mengerti, Mulai"
                  )}
                </Button>
              )}
            </div>

            {ruleStep < RULES.length - 1 && (
              <div className="flex justify-center pt-0.5">
                <button
                  type="button"
                  onClick={startExam}
                  disabled={starting}
                  className="press focus-ring rounded-full px-2 py-0.5 text-[11px] font-medium text-ink-48 hover:text-ink transition-colors"
                >
                  Lewati langsung ke Mulai &rarr;
                </button>
              </div>
            )}
          </div>
        }
        finePrint={
          <>
            <Lock className="size-3" /> Focus Lock aktif saat kamu menekan tombol Mulai.
          </>
        }
      >
        {pending && (
          <div className="flex flex-col items-center text-center py-2 select-none">
            {/* Step Counter Badge */}
            <span className="inline-flex items-center rounded-full bg-pearl border border-hairline/80 px-2.5 py-0.5 text-[11px] font-medium text-ink-48 tracking-wider">
              Langkah {ruleStep + 1} dari {RULES.length}
            </span>

            {/* Icon */}
            <div className="mt-4 flex size-14 items-center justify-center rounded-full bg-pearl border border-hairline text-primary shadow-2xs">
              {(() => {
                const Icon = RULES[ruleStep].icon;
                return <Icon className="size-7" strokeWidth={1.5} />;
              })()}
            </div>

            {/* Title */}
            <h3 className="text-body-strong text-[17px] font-semibold text-ink mt-3">
              {RULES[ruleStep].title}
            </h3>

            {/* Body */}
            <p className="text-caption text-ink-80 mt-1.5 max-w-xs leading-relaxed">
              {RULES[ruleStep].body}
            </p>

            {/* Interactive Dots Navigation */}
            <div className="mt-5 flex items-center justify-center gap-1.5">
              {RULES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRuleStep(i)}
                  aria-label={`Buka langkah ${i + 1}`}
                  className={`press focus-ring transition-all duration-200 rounded-full ${
                    i === ruleStep
                      ? "w-6 h-2 bg-primary"
                      : "w-2 h-2 bg-hairline hover:bg-ink-48"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
