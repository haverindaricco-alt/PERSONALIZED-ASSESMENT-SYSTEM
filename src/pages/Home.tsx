import { Link } from "react-router-dom";
import { Brain, ShieldCheck, Timer, type LucideIcon } from "lucide-react";
import {
  btnPrimaryClass,
  Card,
  Reveal,
  ScoreMockCard,
} from "../components/ui";

/* Pill ghost versi tile gelap: Sky Link Blue #2997ff, sesuai DS. */
const btnGhostDarkClass =
  "press focus-ring select-none inline-flex items-center justify-center rounded-pill border border-link-dark px-7 py-3.5 text-btn-large text-link-dark";

const FEATURES: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: Timer,
    title: "Timer & Auto Submit",
    body: "Sisa waktu dihitung mundur terus. Saat habis, jawaban dikumpulkan otomatis.",
  },
  {
    icon: ShieldCheck,
    title: "Focus Lock Anti-Cheat",
    body: "Pindah tab atau kekurangan fokus halaman? Ujian berhenti dengan status DIHENTIKAN.",
  },
  {
    icon: Brain,
    title: "Diagnostik Agnes AI",
    body: "Peta penguasaan indikator diolah menjadi rekomendasi belajar pribadi dalam hitungan detik.",
  },
];

/* Angka strip statistik: hanya klaim yang dijamin perilaku aplikasi. */
const STATS = [
  { value: "15", unit: "detik", label: "Batas tunggu rekomendasi belajar Agnes AI" },
  { value: "100", unit: "%", label: "Sesi ujian terlindungi Focus Lock anti-cheat" },
  { value: "1", unit: "dashboard", label: "Pengawas mengatur token, durasi, bank soal, dan rekap" },
];

const ALUR = [
  {
    no: "1",
    title: "Masuk",
    body: "Cukup nama lengkap plus token dari pengawas, tanpa perlu membuat akun.",
  },
  {
    no: "2",
    title: "Kerjakan",
    body: "Timer berjalan mundur sementara Focus Lock menjaga integritas; jawaban terkirim otomatis.",
  },
  {
    no: "3",
    title: "Pahami",
    body: "Peta penguasaan per indikator plus rekomendasi belajar pribadi dari Agnes AI.",
  },
];

const SUB_LINKS = [
  { id: "statistik", label: "Statistik" },
  { id: "alur", label: "Alur" },
  { id: "fitur", label: "Fitur" },
  { id: "admin", label: "Admin" },
];

export default function Home() {
  return (
    <div className="min-h-[100dvh] bg-canvas">
      <AnchorBar />

      {/* Tile terang: hero + citra produk */}
      <section className="relative overflow-hidden px-6 pb-24 pt-20 text-center sm:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-24 size-[420px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center">
          <Reveal className="flex flex-col items-center">
            <h1 className="text-hero-display max-w-[820px] text-balance text-ink">
              Personalized Assessment System
            </h1>
            <p className="text-lead-airy mt-4 max-w-[560px] text-ink-80">
              Kuis pilihan ganda yang aman, cepat, dan dilengkapi rekomendasi
              belajar otomatis.
            </p>
            <Link
              to="/student/entry"
              className={btnPrimaryClass + " mt-9 px-7 py-3.5 text-btn-large"}
            >
              Mulai Ujian
            </Link>
            <p className="text-caption mt-6 text-ink-48">
              Masuk dengan nama lengkap plus token dari pengawas.
            </p>
          </Reveal>
          <Reveal delay={150} className="mt-16 flex w-full justify-center">
            <ScoreMockCard />
          </Reveal>
        </div>
      </section>

      {/* Tile gelap: strip statistik produk */}
      <section
        id="statistik"
        className="scroll-mt-16 bg-tile-1 px-6 py-20 sm:px-8"
      >
        <div className="mx-auto grid max-w-[980px] grid-cols-1 gap-y-12 sm:grid-cols-3 sm:gap-8">
          {STATS.map((s, i) => (
            <Reveal key={s.unit + s.value} delay={i * 120}>
              <div className="text-center">
                <p className="text-display-lg text-white tabular-nums">
                  {s.value}
                  <span className="ml-1 text-body-strong text-white/70">
                    {s.unit}
                  </span>
                </p>
                <p className="text-caption mx-auto mt-3 max-w-[240px] text-muted-dark">
                  {s.label}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Tile parchment: alur tiga langkah */}
      <section
        id="alur"
        className="scroll-mt-16 bg-parchment px-6 py-20 sm:px-8"
      >
        <div className="mx-auto max-w-[1100px]">
          <Reveal>
            <h2 className="text-display-md text-center text-ink">
              Tiga langkah dari ujian ke pemahaman
            </h2>
          </Reveal>
          <div className="mt-14 grid grid-cols-1 gap-y-10 md:grid-cols-3 md:gap-10">
            {ALUR.map((step, i) => (
              <Reveal key={step.no} delay={i * 120}>
                <div className="border-t border-hairline pt-8">
                  <p className="text-display-lg text-primary tabular-nums">
                    {step.no}
                  </p>
                  <h3 className="text-body-strong mt-3 text-ink">{step.title}</h3>
                  <p className="text-caption mt-2 max-w-[280px] text-ink-48">
                    {step.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Tile putih: tiga pilar fitur */}
      <section
        id="fitur"
        className="scroll-mt-16 bg-canvas px-6 py-20 sm:px-8"
      >
        <div className="mx-auto max-w-[1440px]">
          <Reveal>
            <h2 className="text-display-md text-center text-ink">
              Tiga pilar di setiap sesi ujian
            </h2>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 120}>
                <Card className="flex h-full flex-col gap-4 p-6">
                  <span className="inline-flex size-11 items-center justify-center rounded-full bg-pearl">
                    <f.icon className="size-5 text-primary" strokeWidth={1.5} />
                  </span>
                  <h3 className="text-body-strong text-ink">{f.title}</h3>
                  <p className="text-caption text-ink-48">{f.body}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Tile gelap: sisi pengawas */}
      <section
        id="admin"
        className="scroll-mt-16 bg-tile-2 px-6 py-20 sm:px-8"
      >
        <div className="mx-auto max-w-[980px] text-center">
          <Reveal className="flex flex-col items-center">
            <h2 className="text-display-lg text-white">
              Dibangun untuk Integritas
            </h2>
            <p className="text-lead-airy mx-auto mt-4 max-w-[560px] text-muted-dark">
              Pengawas mengatur token, durasi, dan bank soal dari satu
              dashboard, memantau rekap nilai secara waktu nyata.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              {["Token", "Durasi", "Bank Soal", "Rekap Real-time"].map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center rounded-chip bg-white/10 px-3.5 py-2 text-caption text-white/80"
                >
                  {c}
                </span>
              ))}
            </div>
            <Link to="/admin/login" className={btnGhostDarkClass + " mt-9"}>
              Portal Admin
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Footer parchment: CTA penutup + kolom tautan */}
      <footer className="bg-parchment px-6 py-16 sm:px-8">
        <div className="mx-auto max-w-[1440px]">
          <Reveal className="flex flex-col items-center gap-5 text-center">
            <h2 className="text-display-md text-ink">Siap mencoba?</h2>
            <Link
              to="/student/entry"
              className={btnPrimaryClass + " px-7 py-3.5 text-btn-large"}
            >
              Mulai Ujian
            </Link>
          </Reveal>
          <div className="mt-16 flex flex-col gap-8 border-t border-hairline pt-10 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-caption-strong text-ink-80">
                Personalized Assessment System
              </p>
              <p className="text-fine-print mt-2 max-w-[420px] text-ink-48">
                Didukung Supabase untuk penyimpanan pembelajaran dan Agnes AI
                untuk rekomendasi. Fokus Lock aktif pada seluruh sesi ujian.
              </p>
            </div>
            <nav aria-label="Tautan footer" className="flex flex-col gap-3">
              <Link
                to="/"
                className="press focus-ring rounded-full text-caption text-ink-48 hover:text-ink"
              >
                Beranda
              </Link>
              <Link
                to="/admin/login"
                className="press focus-ring rounded-full text-caption text-ink-48 hover:text-ink"
              >
                Portal Admin
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------- Bar nav frosted paling atas: brand + anchor ---------- */

function AnchorBar() {
  function jump(id: string) {
    const smooth = !window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  }
  return (
    <nav
      aria-label="Navigasi bagian halaman"
      className="frosted sticky top-0 z-40 flex h-12 items-center justify-between gap-6 border-b border-hairline px-5 sm:h-[52px] sm:px-8"
    >
      <span className="hidden text-tagline text-ink sm:block">
        Personalized Assessment
      </span>
      <div className="mx-auto flex items-center gap-6 sm:gap-8">
        {SUB_LINKS.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => jump(l.id)}
            className="press focus-ring rounded-full text-caption-strong text-ink-48 hover:text-ink"
          >
            {l.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
