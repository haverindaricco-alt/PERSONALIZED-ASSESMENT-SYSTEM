# Personalized Assessment System

Aplikasi asesmen isian berbasis web dengan Focus Lock anti-cheat,
timer otomatis, backup jawaban ke localStorage, rekomendasi belajar
bertenaga AI (Agnes AI, model `agnes-2.5-flash`), dan penilaian yang
dilakukan sepenuhnya di server.

## Stack

- React 18 + Vite + TypeScript
- React Router v6
- Tailwind CSS v4 (design tokens ala Apple di `src/design/theme.css`)
- Supabase PostgreSQL + Supabase Auth (tabel `settings`, `questions`,
  `results`, `class_reports`, view `questions_public`)
- Agnes AI API via Cloudflare Pages Function (`/api/agnes-proxy`)
- Hosting: Cloudflare Pages (`dist` + `functions/`)

## Setup

1. **Database** — Buka Supabase Dashboard > SQL Editor:
   - Database baru: jalankan `supabase/schema.sql`, lalu
     `supabase/security-patch.sql`.
   - Database versi pilihan ganda: jalankan
     `supabase/migration-fill-in.sql` **dulu** (mengosongkan bank soal),
     lalu `supabase/security-patch.sql`.
   Patch ini memasang RLS ketat, view soal tanpa kunci, fungsi
   `canonical_answer` untuk menyetarakan bentuk jawaban, izin hapus
   rekap nilai, tabel `class_reports` untuk ringkasan kelas, serta RPC
   `grade_and_save`, `attach_recommendation`, dan
   `get_result_for_student`. Jalankan ulang `security-patch.sql` bila
   database sudah pernah dipasang sebelum fitur hapus rekap atau
   ringkasan untuk guru ditambahkan.
2. **Akun admin** — Supabase Dashboard > Authentication > Users >
   Add user: buat satu user (email + password). Akun ini dipakai untuk
   login di halaman `/admin/login`. Tidak ada lagi PIN bawaan.
3. **Environment** — Salin `.env.example` menjadi `.env`, lalu isi
   `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` dari
   Supabase > Project Settings > API. `VITE_AGNES_API_KEY` hanya perlu
   untuk dev tanpa proxy (lihat di bawah).
4. **Jalankan**

```bash
npm install
npm run dev
```

## Menjalankan Rekomendasi AI

- **Produksi (Cloudflare Pages)**: kunci disimpan di server. Di Pages
  project > Settings > Environment Variables, set:
  - `AGNES_API_KEY` (wajib)
  - `AGNES_BASE_URL` (opsional, default `https://apihub.agnes-ai.com/v1`)
  - `AGNES_MODEL` (opsional, default `agnes-2.5-flash`)
  Folder `functions/` ikut terdeploy otomatis bersama output `dist`;
  browser hanya berbicara dengan `/api/agnes-proxy` dan kuota dibatasi
  8 permintaan/menit per IP.
- **Dev tanpa proxy**: isi `VITE_AGNES_API_KEY` di `.env`; aplikasi akan
  memanggil Agnes langsung saat `npm run dev` saja. Nilai ini tidak
  dimuat di build produksi.

## Deploy ke Cloudflare Pages

1. Buat project Pages dari repo Git (build command `npm run build`,
   build output directory `dist`).
2. Set environment variables produksi: `AGNES_API_KEY`,
   `AGNES_BASE_URL`, `AGNES_MODEL` (lihat di atas) — jangan
   memakai awalan `VITE_` agar tidak terekspos ke browser.
3. Tambahkan custom domain bila perlu. Redirect SPA: Cloudflare Pages
   menyediakan fallback otomatis untuk `index.html`.

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Server pengembangan |
| `npm run build` | Pemeriksaan tipe + build produksi |
| `npm run preview` | Pra-lihat hasil build |
| `npm run typecheck` | Pemeriksaan tipe saja |

## Fitur utama

- **Portal siswa**: nama + token (dinormalisasi huruf besar), validasi
  status `AKTIF`, modal aturan sebelum mulai, jeda wajib 10 detik
  setelah tiga gagal validasi.
- **Quiz engine**: urutan soal diacak Fisher-Yates per sesi, jawaban
  diketik sebagai teks, timer HH:MM:SS dengan auto submit, jawaban
  tersimpan ke localStorage (tahan refresh). Enter berpindah soal.
- **Penilaian di server**: jawaban teks dikirim ke RPC `grade_and_save`
  dan dibandingkan dengan kunci rumus serta alternatifnya setelah
  dibakukan oleh `canonical_answer`. Huruf besar/kecil dan spasi
  diabaikan; bentuk setara seperti `1/2`, `2/4`, dan `0,5` dianggap sama
  (presisi tiga angka desimal). Kunci tidak pernah dikirim ke browser,
  dan hasil tersimpan walau Agnes AI lambat.
- **Hasil & diagnostik**: nilai skala 100, peta penguasaan indikator
  (hijau >= 75, kuning 50-74, merah < 50), umpan balik belajar Agnes AI
  per indikator yang menyusul setelah hasil tersimpan, tinjauan jawaban
  lengkap dengan kunci rumus. Link hasil hanya bisa dibuka dengan token
  ujian yang cocok.
- **Analisis AI terstruktur**: AI menelusuri langkah pengerjaan tiap
  butir, menandai langkah pertama yang keliru, kesalahan terbawa,
  jawaban benar dengan proses yang perlu diperiksa, serta jenis
  kesalahan (konseptual, prosedural, perhitungan, atau tidak dapat
  ditentukan). Status benar/salah tetap berasal dari server; AI tidak
  menilai ulang kunci jawaban.
- **Ringkasan untuk guru**: menu admin berisi agregat penguasaan
  indikator satu kelas, pola kesalahan berulang, siswa yang perlu
  perhatian, dan laporan AI yang dapat dibuat ulang. Ringkasan
  disimpan di tabel `class_reports`.
- **Anti-cheat Focus Lock**: `visibilitychange` dan `blur` memicu force
  submit dengan status `DIHENTIKAN - Pelanggaran Fokus Halaman`; waktu
  habis menjadi `DIHENTIKAN - Waktu Habis`. Status yang tercatat lebih
  dulu tidak dapat ditimpa jalur lain.
- **Admin**: login email + password lewat Supabase Auth (guard
  `RequireAdmin` memvalidasi sesi JWT), pengaturan token/status/durasi,
  CRUD bank soal dengan nomor unik, kunci rumus, dan alternatif jawaban,
  rekap nilai seluruh siswa dengan umpan balik per siswa, ekspor Excel,
  hapus terpilih/seluruh data, dan ringkasan kelas untuk guru.

## Catatan keamanan

- Semua akses DB dibatasi RLS: tamu anonim hanya bisa membaca token/
  status/durasi dan soal tanpa kunci, serta menulis/membaca hasil
  miliknya lewat RPC; tabel dan kolom sensitif ditutup.
- Kunci Agnes hanya hidup di environment Cloudflare Pages (produksi)
  atau di proses dev lokal — tidak pernah ikut bundle produksi.
- Ganti password admin secara berkala dari Supabase Auth, dan putar
  `AGNES_API_KEY` bila pernah terekspos.
