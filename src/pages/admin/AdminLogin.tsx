import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { supabase, errorMessage } from "../../lib/supabase";
import { Button, Card, Field, inputClass } from "../../components/ui";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setChecking(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        throw new Error(
          authError.message.includes("Invalid login credentials")
            ? "Email atau password keliru."
            : authError.message,
        );
      }
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
          <Lock className="size-5 text-primary" strokeWidth={1.5} />
        </span>

        <h1 className="text-display-md mt-5 text-ink">Portal Admin</h1>
        <p className="text-caption mt-2 text-ink-48">
          Kelola token, durasi, bank soal, dan rekap nilai siswa.
        </p>

        <form onSubmit={login} className="mt-6 flex flex-col gap-5">
          <Field label="Email Admin">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-48" />
              <input
                className={inputClass + " pl-11"}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sekolah.sch.id"
                autoComplete="username"
                required
              />
            </div>
          </Field>

          <Field label="Password">
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              autoComplete="current-password"
              required
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
          <ShieldCheck className="size-3" /> Akun admin dikelola lewat Supabase
          Auth. Hubungi pengelola jika password terlupa.
        </p>
      </Card>
    </div>
  );
}
