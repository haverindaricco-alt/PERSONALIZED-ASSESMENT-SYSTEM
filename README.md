# Asesmen Diagnostik & Ujian Mandiri Online

Aplikasi ujian pilihan ganda berbasis web dengan Focus Lock anti-cheat,
timer otomatis, backup jawaban ke localStorage, dan rekomendasi belajar
bertenaga AI (Agnes AI, model `agnes-2.5-flash`).

## Stack

- React 18 + Vite + TypeScript
- React Router v6
- Tailwind CSS v4 (design tokens ala Apple di `src/design/theme.css`)
- Supabase PostgreSQL (tabel `settings`, `questions`, `results`)
- Agnes AI API (OpenAI-compatible, `https://apihub.agnes-ai.com/v1`)

## Setup

1. **Database** - Buka Supabase Dashboard > SQL Editor, tempel dan jalankan
   seluruh isi `supabase/schema.sql`. Ini membuat tabel, kebijakan RLS, dan
   data awal: token `UJIAN2026`, durasi 30 menit, PIN admin `ADMIN2026`,
   serta 10 soal materi pecahan.
2. **Environment** - Salin `.env.example` menjadi `.env`, lalu isi:
   - `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` dari
     Supabase > Project Settings > API.
   - `VITE_AGNES_API_KEY` dari konsol Agnes AI
     (`https://platform.agnes-ai.com`).
3. **Jalankan**

```bash
npm install
npm run dev
```

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Server pengembangan |
| `npm run build` | Pemeriksaan tipe + build produksi |
| `npm run preview` | Pra-lihat hasil build |
| `npm run typecheck` | Pemeriksaan tipe saja |

## Fitur utama

- **Portal siswa**: nama + token, validasi status `AKTIF`, modal aturan
  sebelum mulai.
- **Quiz engine**: urutan soal diacak Fisher-Yates per sesi, opsi A-E lewat
  klik atau keyboard, auto-advance 300 ms, timer HH:MM:SS dengan auto submit,
  jawaban tersimpan ke localStorage (tahan refresh).
- **Anti-cheat Focus Lock**: `visibilitychange` dan `blur` memicu force
  submit dengan status `DIHENTIKAN - Pelanggaran Fokus Halaman`; waktu habis
  menjadi `DIHENTIKAN - Waktu Habis`.
- **Hasil & diagnostik**: nilai skala 100, peta penguasaan indikator
  (hijau >= 75, kuning 50-74, merah < 50), rekomendasi belajar Agnes AI,
  tinjauan jawaban lengkap dengan kunci.
- **Admin**: login PIN, pengaturan token/status/durasi/PIN, CRUD bank soal,
  rekap nilai sejalan (tabel `results`).

## Catatan keamanan

Kunci API terekspos ke browser karena aplikasi ini serverless klien-penuh
(sesuai PRD). Batasi kuota kunci, dan putar kunci secara berkala. PIN admin
hanya di lindungi lapisan klien; untuk produksi nyata tambahkan enkripsi
baris / service role di backend.
