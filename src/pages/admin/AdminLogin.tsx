import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { Button, Card, Field, inputClass } from "../../components/ui";
import {
  errorMessage,
  fetchFirstSettings,
} from "../../lib/supabase";
import { setAdminAuth } from "../../components/guards";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setChecking(true);
    try {
      const settings = await fetchFirstSettings();
      if (!settings) {
        throw new Error(
          "Pengaturan ujian belum ada. Jalankan supabase/schema.sql di SQL Editor Supabase terlebih dahulu.",
        );
      }
      if (pin.trim() !== settings.admin_pin) {
        throw new Error("PIN admin keliru.");
      }
      setAdminAuth(true);
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-parchment px-4 py-10">
      <Card className="w-full max-w-sm p-6 sm:p-8">
        <span className="flex size-11 items-center justify-center rounded-full bg-pearl">
          <KeyRound className="size-5 text-primary" strokeWidth={1.5} />
        </span>

        <h1 className="text-display-md mt-5 text-ink">Portal Admin</h1>
        <p className="text-caption mt-2 text-ink-48">
          Kelola token, durasi, bank soal, dan rekap nilai siswa.
        </p>

        <form onSubmit={login} className="mt-6 flex flex-col gap-5">
          <Field label="Kode PIN Admin">
            <input
              className={inputClass}
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Masukkan PIN"
              autoComplete="current-password"
            />
          </Field>

          {error && (
            <p className="text-caption rounded-util bg-bad/10 px-4 py-3 leading-relaxed text-bad">
              {error}
            </p>
          )}

          <Button type="submit" disabled={checking} className="w-full">
            {checking ? <Loader2 className="size-5 animate-spin" /> : "Masuk"}
          </Button>
        </form>

        <p className="text-micro mt-5 flex items-center gap-1.5 text-ink-48">
          <ShieldCheck className="size-3" /> PIN bawaan ADMIN2026, ubah di tab
          Pengaturan.
        </p>
      </Card>
    </div>
  );
}
