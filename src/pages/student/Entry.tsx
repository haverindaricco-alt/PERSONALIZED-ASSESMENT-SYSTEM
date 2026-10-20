import { useState, useEffect, useRef, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Keyboard, Loader2, Lock, Save, ShieldAlert, Timer } from "lucide-react";
import {
  Button,
  Card,
  Field,
  Modal,
  PearlChip,
  inputClass,
} from "../../components/ui";
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
    body: "Pilih jawaban dengan tombol A sampai E atau klik di layar. Enter melaju ke soal berikutnya.",
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
  /** Backoff percobaan token (SEC-07): setelah 3 gagal, berhenti 10 detik. */
  const attemptRef = useRef(0);
  const [lockUntil, setLockUntil] = useState(0);
  const [, tick] = useState(0);

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
    <div className="flex min-h-[100dvh] items-center justify-center bg-parchment px-4 py-10">
      <Card className="w-full max-w-md p-6 sm:p-8">
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

      {/* Modal konfirmasi aturan sebelum mulai */}
      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        dismissable={!starting}
        title="Aturan & Proteksi Ujian"
        subtitle={
          pending && (
            <span className="flex flex-wrap items-center gap-2">
              <PearlChip>
                <Timer className="size-3.5 text-primary" />
                {pending.settings.duration_minutes} menit
              </PearlChip>
              <PearlChip>{pending.questions.length} soal</PearlChip>
              <PearlChip>
                <span className="tracking-widest">{pending.settings.token}</span>
              </PearlChip>
            </span>
          )
        }
        footer={
          <div className="flex flex-col gap-3 sm:flex-row-reverse">
            <Button
              variant="primary"
              onClick={startExam}
              disabled={starting}
              className="flex-1"
            >
              {starting ? "Menyiapkan kuis…" : "Saya Mengerti, Mulai"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setPending(null)}
              disabled={starting}
              className="flex-1"
            >
              Batal
            </Button>
          </div>
        }
        finePrint={
          <>
            <Lock className="size-3" /> Fokus Lock aktif saat kamu menekan tombol
            Mulai.
          </>
        }
      >
        {pending && (
          <ul className="flex flex-col divide-y divide-hairline">
            {RULES.map((r) => (
              <li
                key={r.title}
                className="flex gap-4 py-5 first:pt-0 last:pb-0"
              >
                <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-pearl">
                  <r.icon className="size-4.5 text-primary" strokeWidth={1.5} />
                </span>
                <div>
                  <p className="text-body-strong text-ink">{r.title}</p>
                  <p className="text-caption mt-1 text-ink-48">{r.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
