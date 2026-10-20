import { Link } from "react-router-dom";
import { Brain, ShieldCheck, Timer } from "lucide-react";
import { GlobalNav } from "../components/nav";
import { btnPrimaryClass, Card } from "../components/ui";

/* Pill ghost versi tile gelap: Sky Link Blue #2997ff, sesuai DS. */
const btnGhostDarkClass =
  "press focus-ring select-none inline-flex items-center justify-center rounded-pill border border-link-dark px-7 py-3.5 text-btn-large text-link-dark";

const FEATURES = [
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

export default function Home() {
  return (
    <div className="min-h-[100dvh] bg-canvas">
      <GlobalNav brand="Asesmen Diagnostik" />

      {/* Tile terang: hero */}
      <section className="flex min-h-[76dvh] flex-col items-center justify-center px-6 py-20 text-center">
        <h1 className="text-hero-display max-w-[820px] text-balance text-ink">
          Asesmen Diagnostik Online
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
      </section>

      {/* Tile gelap: sisi pengawas */}
      <section className="bg-tile-1 px-6 py-20 sm:px-8">
        <div className="mx-auto max-w-[980px] text-center">
          <h2 className="text-display-lg text-white">
            Dibangun untuk Integritas
          </h2>
          <p className="text-lead-airy mx-auto mt-4 max-w-[560px] text-muted-dark">
            Pengawas mengatur token, durasi, dan bank soal dari satu
            dashboard, memantau rekap nilai secara waktu nyata.
          </p>
          <Link
            to="/admin/login"
            className={btnGhostDarkClass + " mt-9"}
          >
            Portal Admin
          </Link>
        </div>
      </section>

      {/* Tile putih: tiga pilar */}
      <section className="bg-canvas px-6 pb-20 pt-20 sm:px-8">
        <div className="mx-auto max-w-[1440px]">
          <h2 className="text-display-md text-center text-ink">
            Tiga pilar di setiap sesi ujian
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="flex flex-col gap-3 p-6">
                <f.icon className="size-6 text-primary" strokeWidth={1.5} />
                <h3 className="text-body-strong text-ink">{f.title}</h3>
                <p className="text-caption text-ink-48">{f.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer parchment padat */}
      <footer className="bg-parchment px-6 py-16 sm:px-8">
        <div className="mx-auto max-w-[1440px]">
          <p className="text-caption-strong text-ink-80">
            Asesmen Diagnostik Online
          </p>
          <p className="text-fine-print mt-2 text-ink-48">
            Didukung Supabase untuk penyimpanan pembelajaran dan
            Agnes AI untuk rekomendasi. Fokus Lock aktif pada seluruh sesi
            ujian.
          </p>
        </div>
      </footer>
    </div>
  );
}
