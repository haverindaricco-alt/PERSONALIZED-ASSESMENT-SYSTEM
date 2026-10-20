# Personalized Assessment System

Aplikasi ujian pilihan ganda berbasis web dengan Focus Lock anti-cheat,
timer otomatis, backup jawaban ke localStorage, rekomendasi belajar
bertenaga AI (Agnes AI, model `agnes-2.5-flash`), dan penilaian yang
dilakukan sepenuhnya di server.

## Stack

- React 18 + Vite + TypeScript
- React Router v6
- Tailwind CSS v4 (design tokens ala Apple di `src/design/theme.css`)
- Supabase PostgreSQL + Supabase Auth (tabel `settings`, `questions`,
  `results`, view `questions_public`)
- Agnes AI API via Cloudflare Pages Function (`/api/agnes-proxy`)
- Hosting: Cloudflare Pages (`dist` + `functions/`)

## Setup

1. **Database** — Buka Supabase Dashboard > SQL Editor:
   - Database baru: jalankan seluruh isi `supabase/schema.sql` terlebih
     dahulu, lalu `supabase/security-patch.sql`.
   - Database yang sudah ada dari versi lama: cukup jalankan
     `supabase/security-patch.sql`.
   Patch ini memasang RLS ketat, view soal tanpa kunci jawaban, fungsi
   penilaian server-side (`grade_and_save`, `attach_recommendation`,
   `get_result_for_student`), dan menghapus kolom `admin_pin`.
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
- **Quiz engine**: urutan soal diacak Fisher-Yates per sesi, opsi A-E
  lewat klik atau keyboard, auto-advance 300 ms, timer HH:MM:SS dengan
  auto submit, jawaban tersimpan ke localStorage (tahan refresh).
- **Penilaian di server**: jawaban dikirim ke RPC `grade_and_save`;
  skor, benar/salah, dan peta indikator dihitung oleh database. Kunci
  jawaban tidak pernah dikirim ke browser (view `questions_public`
  bahkan tidak memuat kolomnya), dan hasil tersimpan dalam hitungan
  detik walau Agnes AI lambat.
- **Hasil & diagnostik**: nilai skala 100, peta penguasaan indikator
  (hijau >= 75, kuning 50-74, merah < 50), rekomendasi belajar Agnes AI
  yang menyusul setelah hasil tersimpan, tinjauan jawaban lengkap
  dengan kunci. Link hasil hanya bisa dibuka dengan token ujian yang
  cocok.
- **Anti-cheat Focus Lock**: `visibilitychange` dan `blur` memicu force
  submit dengan status `DIHENTIKAN - Pelanggaran Fokus Halaman`; waktu
  habis menjadi `DIHENTIKAN - Waktu Habis`. Status yang tercatat lebih
  dulu tidak dapat ditimpa jalur lain.
- **Admin**: login email + password lewat Supabase Auth (guard
  `RequireAdmin` memvalidasi sesi JWT), pengaturan token/status/durasi,
  CRUD bank soal dengan nomor unik, rekap nilai seluruh siswa.

## Catatan keamanan

- Semua akses DB dibatasi RLS: tamu anonim hanya bisa membaca token/
  status/durasi dan soal tanpa kunci, serta menulis/membaca hasil
  miliknya lewat RPC; tabel dan kolom sensitif ditutup.
- Kunci Agnes hanya hidup di environment Cloudflare Pages (produksi)
  atau di proses dev lokal — tidak pernah ikut bundle produksi.
- Ganti password admin secara berkala dari Supabase Auth, dan putar
  `AGNES_API_KEY` bila pernah terekspos.
