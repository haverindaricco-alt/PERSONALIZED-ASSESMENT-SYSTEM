import { Link } from "react-router-dom";
import {
  Brain,
  ShieldCheck,
  Timer,
  SlidersHorizontal,
  ArrowRight,
  Check,
  Database,
  Sparkles,
} from "lucide-react";
import {
  btnPrimaryClass,
  btnGhostClass,
  Card,
  Reveal,
  InteractiveQuizPreview,
  Accordion,
  type AccordionItem,
} from "../components/ui";
import { LandingNavbar } from "../components/nav";

/* ============================================================
   Data Statistik Produk (Berdasarkan parameter sistem riil)
   ============================================================ */
const STATS = [
  {
    value: "15",
    unit: "Detik",
    label: "Batas pemrosesan diagnosis belajar personal oleh Agnes AI",
  },
  {
    value: "100%",
    unit: "Integritas",
    label: "Sesi ujian terproteksi otomatis oleh Focus Lock anti-cheat",
  },
  {
    value: "0",
    unit: "Akun",
    label: "Siswa masuk langsung dengan token tanpa registrasi berbelit",
  },
];

/* ============================================================
   Data Alur Tiga Langkah Menuju Diagnostik
   ============================================================ */
const ALUR = [
  {
    no: "01",
    title: "Masuk dengan Token",
    body: "Siswa cukup memasukkan nama lengkap dan kode token 8-karakter dari pengawas. Tanpa perlu email atau kata sandi.",
    tag: "Akses Instan",
  },
  {
    no: "02",
    title: "Pengerjaan Terkunci",
    body: "Timer mundur aktif dengan Focus Lock menjaga layar. Pindah tab atau aplikasi akan langsung menghentikan ujian.",
    tag: "Lingkungan Aman",
  },
  {
    no: "03",
    title: "Pemetaan & Rekomendasi",
    body: "Analisis diagnostik Agnes AI mengidentifikasi kekuatan dan kelemahan spesifik per indikator materi dalam hitungan detik.",
    tag: "Tindak Lanjut Personal",
  },
];

/* ============================================================
   Data FAQ Teknis
   ============================================================ */
const FAQ_ITEMS: AccordionItem[] = [
  {
    id: "faq-1",
    question: "Bagaimana cara kerja Focus Lock dalam mendeteksi kecurangan?",
    answer:
      "Focus Lock memanfaatkan Page Visibility API dan event listener window blur di browser siswa. Begitu siswa mencoba berpindah tab, membuka jendela baru, atau beralih aplikasi desktop, sistem mendeteksi hilangnya fokus dan seketika mengunci ujian dengan status 'DIHENTIKAN' serta mengirimkan timestamp pelanggaran ke pengawas.",
  },
  {
    id: "faq-2",
    question: "Bagaimana Agnes AI menghasilkan analisis diagnostik?",
    answer:
      "Setiap butir soal dalam bank soal telah dipetakan ke indikator kompetensi pembelajaran spesifik (misalnya: 'Penyederhanaan Pecahan' atau 'Pecahan Senilai'). Agnes AI mengevaluasi pola jawaban yang benar dan salah, mengukur persentase penguasaan tiap indikator, lalu menyusun panduan remedial yang konkret dan bertahap bagi siswa.",
  },
  {
    id: "faq-3",
    question: "Apakah jawaban siswa aman jika terjadi kendala koneksi internet?",
    answer:
      "Ya. Sistem menerapkan dual-storage architecture: setiap jawaban yang diketik disimpan seketika ke dalam penyimpanan lokal (localStorage) di perangkat siswa sebelum disinkronkan ke Supabase. Jika browser tidak sengaja ter-refresh atau koneksi terputus sesaat, progres jawaban tetap tersimpan aman.",
  },
  {
    id: "faq-4",
    question: "Apakah pengawas dapat mengatur durasi ujian dan bank soal sendiri?",
    answer:
      "Pengawas memiliki akses penuh melalui Portal Admin untuk membuat token ujian baru, menentukan durasi pengerjaan dalam menit, menambah atau menyunting bank soal per indikator, serta memantau dan mengekspor rekap perolehan nilai siswa secara waktu nyata.",
  },
  {
    id: "faq-5",
    question: "Apakah siswa memerlukan instalasi aplikasi atau akun khusus?",
    answer:
      "Tidak diperlukan instalasi apa pun. Personalized Assessment System berjalan sepenuhnya di peramban web modern (Google Chrome, Safari, Edge, Firefox) baik pada laptop, komputer desktop, maupun perangkat tablet.",
  },
];

export default function Home() {
  return (
    <div className="min-h-[100dvh] bg-canvas text-ink">
      <LandingNavbar />

      {/* ============================================================
          1. HERO SECTION & INTERACTIVE SHOWCASE
          ============================================================ */}
      <section
        id="simulasi"
        className="relative overflow-hidden px-5 pb-20 pt-28 sm:px-8 sm:pb-24 sm:pt-36 text-center"
      >
        <div className="mx-auto flex max-w-4xl flex-col items-center">
          <Reveal className="flex flex-col items-center">
            {/* Subtle top indicator */}
            <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-pearl px-3.5 py-1 text-[12px] font-medium text-ink-80 shadow-2xs">
              <span className="flex size-1.5 rounded-full bg-ok" />
              <span>Sistem Ujian Diagnostik Terstandar</span>
            </div>

            {/* Headline */}
            <h1 className="text-hero-display mt-6 max-w-[840px] text-balance text-ink">
              Ujian Berintegritas. Diagnosis Belajar Terarah.
            </h1>

            {/* Subheading */}
            <p className="text-lead-airy mt-4 max-w-[620px] text-ink-80">
              Evaluasi kompetensi lewat soal isian yang dilindungi protokol Focus
              Lock anti-cheat dan dianalisis langsung oleh Agnes AI untuk
              memetakan kebutuhan belajar siswa.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/student/entry"
                className={btnPrimaryClass + " px-7 py-3.5 text-btn-large"}
              >
                <span>Mulai Ujian Siswa</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/admin/login"
                className={btnGhostClass + " px-6 py-3.5 text-btn-large"}
              >
                <span>Portal Pengawas</span>
              </Link>
            </div>

            <p className="text-caption mt-4 text-ink-48">
              Tanpa registrasi. Cukup masukkan nama dan token ujian dari pengawas.
            </p>
          </Reveal>

          {/* Interactive Mini-Assessment Preview in Hero */}
          <Reveal delay={150} className="mt-14 w-full flex flex-col items-center">
            <InteractiveQuizPreview />
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          2. STRIP STATISTIK PRODUK (Hairline Grid)
          ============================================================ */}
      <section className="border-y border-hairline bg-parchment px-5 py-14 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 divide-y divide-hairline sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {STATS.map((s, i) => (
              <Reveal
                key={s.label}
                delay={i * 100}
                className="px-6 py-4 text-center sm:first:pl-0 sm:last:pr-0"
              >
                <p className="text-display-lg text-ink tabular-nums font-semibold tracking-tight">
                  {s.value}
                  <span className="ml-1 text-tagline text-primary font-normal">
                    {s.unit}
                  </span>
                </p>
                <p className="text-caption mx-auto mt-2 max-w-[240px] text-ink-48">
                  {s.label}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          3. BENTO GRID FITUR UTAMA (Showcase Asimetris)
          ============================================================ */}
      <section id="fitur" className="scroll-mt-20 bg-canvas px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <Reveal className="text-center">
            <span className="rounded-chip bg-pearl border border-hairline/80 px-3 py-1 text-[12px] font-medium text-ink-48 uppercase tracking-wider">
              Arsitektur Sistem
            </span>
            <h2 className="text-display-md mt-4 text-ink">
              Tiga pilar integritas dan analisis diagnostik
            </h2>
            <p className="text-lead-airy mx-auto mt-3 max-w-[560px] text-ink-48">
              Dirancang untuk menghapus celah kecurangan sekaligus memberikan nilai
              pedagogis nyata setelah ujian selesai.
            </p>
          </Reveal>

          {/* 4-Block Asymmetric Bento Grid */}
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-12">
            {/* Blok 1: Focus Lock Engine (7 kolom) */}
            <Reveal className="md:col-span-7">
              <Card className="flex h-full flex-col justify-between p-6 sm:p-8 border border-hairline bg-canvas">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-full bg-pearl border border-hairline text-primary">
                      <ShieldCheck className="size-5" />
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-ok/10 text-ok px-2.5 py-1 text-[11px] font-medium border border-ok/20">
                      <span className="size-1.5 rounded-full bg-ok" />
                      Zero-Tolerance Anti-Cheat
                    </span>
                  </div>

                  <h3 className="text-tagline mt-6 text-ink font-semibold">
                    Focus Lock Anti-Cheat Engine
                  </h3>
                  <p className="text-caption mt-2 text-ink-80 leading-relaxed">
                    Sistem mendeteksi perpindahan tab, minimize jendela browser, atau
                    kehilangan fokus kursor. Sesi ujian seketika dihentikan secara
                    otomatis dengan status <strong>DIHENTIKAN</strong> guna mencegah
                    pencarian contekan.
                  </p>
                </div>

                {/* Visual Technical Simulation Card */}
                <div className="mt-6 rounded-util border border-hairline bg-pearl p-4 text-[12px] font-mono text-ink-80">
                  <div className="flex items-center justify-between border-b border-hairline/80 pb-2 text-[11px] text-ink-48">
                    <span>EVENT LISTENER LOG</span>
                    <span className="text-ok">ACTIVE</span>
                  </div>
                  <div className="mt-2.5 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-ink-48">&bull; document.visibilityState</span>
                      <span className="text-ink font-medium">visible</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-48">&bull; window.onblur event</span>
                      <span className="text-ok font-medium">LOCKED</span>
                    </div>
                    <div className="flex justify-between border-t border-hairline/60 pt-1.5 text-bad">
                      <span>&bull; status_on_breach</span>
                      <span className="font-semibold">ABORT_IMMEDIATE</span>
                    </div>
                  </div>
                </div>
              </Card>
            </Reveal>

            {/* Blok 2: Agnes AI Diagnostic Matrix (5 kolom) */}
            <Reveal delay={100} className="md:col-span-5">
              <Card className="flex h-full flex-col justify-between p-6 sm:p-8 border border-hairline bg-canvas">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-full bg-pearl border border-hairline text-primary">
                      <Brain className="size-5" />
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-medium">
                      <Sparkles className="size-3" />
                      Pedagogical AI
                    </span>
                  </div>

                  <h3 className="text-tagline mt-6 text-ink font-semibold">
                    Diagnostik Indikator Agnes AI
                  </h3>
                  <p className="text-caption mt-2 text-ink-80 leading-relaxed">
                    Lebih dari sekadar angka total. Sistem memetakan jawaban ke
                    matriks indikator kompetensi dan menguraikan rekomendasi belajar
                    secara objektif.
                  </p>
                </div>

                {/* Visual Matrix Preview */}
                <div className="mt-6 space-y-2.5 rounded-util border border-hairline bg-pearl p-4">
                  <div>
                    <div className="flex justify-between text-[11px] font-medium text-ink-80">
                      <span>Membandingkan Pecahan</span>
                      <span className="text-ok tabular-nums">85%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-hairline overflow-hidden">
                      <div className="h-full bg-ok rounded-full w-[85%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-medium text-ink-80">
                      <span>Operasi Hitung Pecahan</span>
                      <span className="text-ok tabular-nums">83%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-hairline overflow-hidden">
                      <div className="h-full bg-ok rounded-full w-[83%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-medium text-ink-80">
                      <span>Pecahan Senilai</span>
                      <span className="text-warn tabular-nums">57%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-hairline overflow-hidden">
                      <div className="h-full bg-warn rounded-full w-[57%]" />
                    </div>
                  </div>
                </div>
              </Card>
            </Reveal>

            {/* Blok 3: Timer & Auto-Submit (5 kolom) */}
            <Reveal delay={150} className="md:col-span-5">
              <Card className="flex h-full flex-col justify-between p-6 sm:p-8 border border-hairline bg-canvas">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-full bg-pearl border border-hairline text-primary">
                      <Timer className="size-5" />
                    </span>
                    <span className="rounded-full bg-pearl border border-hairline px-2.5 py-1 text-[11px] font-medium text-ink-48">
                      Dual-Storage Sync
                    </span>
                  </div>

                  <h3 className="text-tagline mt-6 text-ink font-semibold">
                    Timer Presisi & Auto-Submit
                  </h3>
                  <p className="text-caption mt-2 text-ink-80 leading-relaxed">
                    Sisa waktu dihitung independen. Begitu timer habis, seluruh
                    jawaban tersimpan otomatis dikumpulkan ke server tanpa risiko data
                    hilang.
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between rounded-util border border-hairline bg-pearl p-3.5">
                  <div className="flex items-center gap-2 text-ink">
                    <Database className="size-4 text-ink-48" />
                    <span className="text-caption text-ink-80">Penyimpanan Lokal:</span>
                  </div>
                  <span className="text-caption-strong text-ok font-medium">
                    Auto-Save Aktif
                  </span>
                </div>
              </Card>
            </Reveal>

            {/* Blok 4: Panel Pengawas Terpusat (7 kolom) */}
            <Reveal delay={200} className="md:col-span-7">
              <Card className="flex h-full flex-col justify-between p-6 sm:p-8 border border-hairline bg-canvas">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-full bg-pearl border border-hairline text-primary">
                      <SlidersHorizontal className="size-5" />
                    </span>
                    <span className="rounded-full bg-pearl border border-hairline px-2.5 py-1 text-[11px] font-medium text-ink-48">
                      Pengawasan Real-Time
                    </span>
                  </div>

                  <h3 className="text-tagline mt-6 text-ink font-semibold">
                    Kontrol Pengawas Terpusat
                  </h3>
                  <p className="text-caption mt-2 text-ink-80 leading-relaxed">
                    Pengawas mengontrol seluruh jalannya asesmen dari satu dashboard:
                    membuat token ujian unik, menetapkan durasi pengerjaan, mengelola
                    bank soal, dan mengekspor rekap perolehan nilai siswa.
                  </p>
                </div>

                {/* Visual Admin Token Generator */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="rounded-util border border-hairline bg-pearl p-3">
                    <span className="text-[11px] text-ink-48 block">TOKEN AKTIF</span>
                    <span className="text-body-strong font-mono tracking-widest text-primary mt-0.5 block">
                      MTK2026
                    </span>
                  </div>
                  <div className="rounded-util border border-hairline bg-pearl p-3">
                    <span className="text-[11px] text-ink-48 block">REKAP NILAI</span>
                    <span className="text-body-strong text-ink mt-0.5 block">
                      Tersinkron Waktu Nyata
                    </span>
                  </div>
                </div>
              </Card>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============================================================
          4. ALUR TIGA LANGKAH (Step Progression)
          ============================================================ */}
      <section id="alur" className="scroll-mt-20 border-t border-hairline bg-parchment px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <Reveal className="text-center">
            <span className="rounded-chip bg-pearl border border-hairline/80 px-3 py-1 text-[12px] font-medium text-ink-48 uppercase tracking-wider">
              Metodologi
            </span>
            <h2 className="text-display-md mt-4 text-ink">
              Tiga langkah dari pengerjaan ke diagnosis
            </h2>
            <p className="text-lead-airy mx-auto mt-3 max-w-[560px] text-ink-48">
              Alur asesmen yang ringkas bagi siswa, transparan bagi pengawas, dan
              bermakna bagi guru pengajar.
            </p>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {ALUR.map((step, i) => (
              <Reveal key={step.no} delay={i * 120}>
                <Card className="flex h-full flex-col justify-between p-6 sm:p-7 border border-hairline bg-canvas">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-display-md text-primary font-semibold tabular-nums">
                        {step.no}
                      </span>
                      <span className="rounded-full bg-pearl border border-hairline px-2.5 py-0.5 text-[11px] font-medium text-ink-48">
                        {step.tag}
                      </span>
                    </div>
                    <h3 className="text-body-strong mt-5 text-ink font-semibold">
                      {step.title}
                    </h3>
                    <p className="text-caption mt-2 text-ink-80 leading-relaxed">
                      {step.body}
                    </p>
                  </div>

                  <div className="mt-6 border-t border-hairline/80 pt-4 flex items-center gap-1.5 text-caption text-primary">
                    <Check className="size-3.5" />
                    <span>Langkah terverifikasi sistem</span>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          5. FAQ TEKNIS (Minimalist Clean Accordion)
          ============================================================ */}
      <section id="faq" className="scroll-mt-20 border-t border-hairline bg-canvas px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <Reveal className="text-center">
            <span className="rounded-chip bg-pearl border border-hairline/80 px-3 py-1 text-[12px] font-medium text-ink-48 uppercase tracking-wider">
              Pertanyaan Umum
            </span>
            <h2 className="text-display-md mt-4 text-ink">
              Transparansi Arsitektur & Pelaksanaan Ujian
            </h2>
            <p className="text-lead-airy mx-auto mt-3 max-w-[520px] text-ink-48">
              Jawaban lugas seputar keamanan Focus Lock, pemetaan Agnes AI, dan
              keandalan penyimpanan data.
            </p>
          </Reveal>

          <Reveal delay={120} className="mt-12">
            <Accordion items={FAQ_ITEMS} />
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          6. PENUTUP & FOOTER
          ============================================================ */}
      <footer className="border-t border-hairline bg-parchment px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-5xl">
          {/* Confident Final CTA */}
          <Reveal className="flex flex-col items-center text-center pb-16 border-b border-hairline">
            <h2 className="text-display-md max-w-xl text-ink font-semibold">
              Mulai Evaluasi Pembelajaran yang Terstandar
            </h2>
            <p className="text-lead-airy mt-3 max-w-[520px] text-ink-48">
              Uji pemahaman siswa secara adil, aman, dan dapatkan peta kompetensi
              yang langsung bisa ditindaklanjuti.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/student/entry"
                className={btnPrimaryClass + " px-7 py-3.5 text-btn-large"}
              >
                <span>Mulai Ujian Sekarang</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/admin/login"
                className="press focus-ring rounded-full border border-hairline bg-canvas px-6 py-3.5 text-btn-large text-ink hover:bg-pearl"
              >
                <span>Buka Portal Pengawas</span>
              </Link>
            </div>
          </Reveal>

          {/* Bottom Meta & Navigation */}
          <div className="mt-12 flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Brain className="size-5 text-primary" />
                <span className="font-semibold text-ink text-sm sm:text-base">
                  Personalized Assessment System
                </span>
              </div>
              <p className="text-caption mt-2 max-w-[420px] text-ink-48 leading-relaxed">
                Platform evaluasi diagnostik berbasis indikator kompetensi. Didukung
                Supabase untuk persistensi data dan Agnes AI untuk pemetaan belajar.
                Focus Lock aktif penuh pada seluruh sesi.
              </p>
            </div>

            <nav aria-label="Tautan navigasi footer" className="flex flex-col gap-2.5 sm:text-right">
              <span className="text-[12px] font-semibold uppercase tracking-wider text-ink-48">
                Navigasi
              </span>
              <a
                href="#simulasi"
                className="text-caption text-ink-80 hover:text-ink transition-colors"
              >
                Simulasi Ujian
              </a>
              <a
                href="#fitur"
                className="text-caption text-ink-80 hover:text-ink transition-colors"
              >
                Fitur & Integritas
              </a>
              <a
                href="#alur"
                className="text-caption text-ink-80 hover:text-ink transition-colors"
              >
                Alur Sistem
              </a>
              <a
                href="#faq"
                className="text-caption text-ink-80 hover:text-ink transition-colors"
              >
                FAQ Teknis
              </a>
              <Link
                to="/admin/login"
                className="text-caption text-primary font-medium hover:underline pt-1"
              >
                Portal Pengawas &rarr;
              </Link>
            </nav>
          </div>

          <div className="mt-12 pt-6 border-t border-hairline/60 text-center sm:text-left text-[11px] text-ink-48">
            &copy; {new Date().getFullYear()} Personalized Assessment System. Desain editorial monokrom berbasis Apple Design System.
          </div>
        </div>
      </footer>
    </div>
  );
}
