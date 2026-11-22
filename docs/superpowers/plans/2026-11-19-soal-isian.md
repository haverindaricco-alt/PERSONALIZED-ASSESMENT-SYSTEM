# Soal Isian Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengubah asesmen pilihan ganda menjadi isian dengan penilaian ekivalensi jawaban di server.

**Architecture:** Kolom opsi dan kunci huruf diganti `answer_key` + `answer_alternatives`. Fungsi SQL `canonical_answer` membersihkan dan menyetarakan bentuk jawaban; `grade_and_save` membandingkan bentuk baku. UI siswa/admin/hasil disesuaikan.

**Tech Stack:** React 18 + Vite + TypeScript, Supabase PostgreSQL RPC, Tailwind CSS v4.

**Spec:** `docs/superpowers/specs/2026-11-19-soal-isian-design.md`

## Global Constraints
- Presisi kanonik 3 angka desimal.
- Kunci dan alternatif tidak boleh masuk `questions_public` atau localStorage.
- Bank soal dikosongkan; `results` lama dipertahankan.
- Pesan UI dan prompt AI berbahasa Indonesia.
- Grading tetap instan dan server-side.

## Review Focus
- Jawaban dengan spasi/huruf besar berbeda -> tetap benar (uji di Task 1 & 3).
- Pecahan setara `1/2`, `2/4`, `0,5` -> benar (uji di Task 1 & 3).
- Alternatif sinonim `lima per enam` -> benar (uji di Task 1).
- Desimal terlalu pendek `0,83` untuk `5/6` -> salah (uji di Task 1).
- Sesi localStorage lama berisi jawaban huruf -> tidak terbaca (uji di Task 2).

---

### Task 1: Database schema & grading SQL

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `supabase/security-patch.sql`
- Create: `supabase/migration-fill-in.sql`

**Interfaces:**
- Produces: `public.canonical_answer(text) -> text`, `questions.answer_key text`, `questions.answer_alternatives text[]`, RPC `grade_and_save(text,text,jsonb,text)`.

- [ ] **Step 1: Update `schema.sql`** — hapus kolom opsi/`correct_answer`/`admin_pin`, tambah `answer_key` dan `answer_alternatives`, hapus seed soal, pertahankan seed settings.
- [ ] **Step 2: Update `security-patch.sql`** — `drop view if exists questions_public` lalu buat ulang tanpa opsi/kunci; `add column if not exists` untuk kolom baru; hapus blok backfill lama; buat `canonical_answer`; tulis ulang `grade_and_save` memakai perbandingan kanonik kunci/alternatif; grant execute.
- [ ] **Step 3: Buat `migration-fill-in.sql`** — drop view, drop kolom opsi dan `correct_answer`, `delete from public.questions;`.
- [ ] **Step 4: Verifikasi SQL statis** — cek tidak ada referensi `correct_answer`/`option_` di fungsi baru dan tidak ada seed soal.
- [ ] **Step 5: Commit.**

### Task 2: Types, scoring & storage

**Files:**
- Modify: `src/types.ts`, `src/lib/scoring.ts`, `src/lib/storage.ts`

**Interfaces:**
- Consumes: kolom DB dari Task 1.
- Produces: `StudentQuestion` tanpa opsi, `QuestionRow.answer_key/answer_alternatives`, `AnswerMap = Record<string,string>`, `ResultRow.answers_key_json: Record<string,string>|null`, `loadAnswers()/saveAnswers()` dengan kunci `v2`.

- [ ] **Step 1: `types.ts`** — hapus `AnswerLetter`/`ANSWER_LETTERS`, perbarui `StudentQuestion`, `QuestionRow`, `AnswerMap`, `answers_key_json`.
- [ ] **Step 2: `scoring.ts`** — hapus `optionText`, `summarizeAnswers`, `ScoreSummary`, dan re-ekspor `ANSWER_LETTERS`.
- [ ] **Step 3: `storage.ts`** — proyeksi soal hanya kolom aman; ganti `pas.session.v1`/`pas.answers.v1` jadi `v2`.
- [ ] **Step 4: Verifikasi** `npm run typecheck` (gagal di file lain sampai Task 3-5 selesai, pastikan error hanya di konsumen lama).
- [ ] **Step 5: Commit.**

### Task 3: Student quiz UI

**Files:** Modify `src/pages/student/Quiz.tsx`

**Interfaces:**
- Consumes: `AnswerMap` string dari Task 2.

- [ ] **Step 1: Ganti pemilihan opsi** dengan input teks, hapus auto-advance dan pintasan A-E; Enter berpindah/submit.
- [ ] **Step 2: Perbarui penghitung** "terjawab" dan tambah petunjuk ekivalensi.
- [ ] **Step 3: Verifikasi** `npm run typecheck` tidak ada error di `Quiz.tsx`.
- [ ] **Step 4: Commit.**

### Task 4: Admin bank soal & normalizer klien

**Files:** Create `src/lib/answerFormat.ts`; Modify `src/pages/admin/Dashboard.tsx`

**Interfaces:**
- Consumes: `QuestionRow` dari Task 2.
- Produces: `canonicalAnswer(text: string): string` (mirror SQL), form kunci + alternatif.

- [ ] **Step 1: Buat `answerFormat.ts`** dengan `canonicalAnswer` (lowercase, spasi, koma->titik, bulat/desimal/pecahan/campuran -> 3 desimal, fallback alnum).
- [ ] **Step 2: `Dashboard.tsx`** — ganti form opsi/kunci huruf dengan input kunci + repeater alternatif; validasi kunci wajib; tampilkan kunci rumus di daftar soal dan bentuk baku di form.
- [ ] **Step 3: Verifikasi** `npm run typecheck` tidak ada error di `Dashboard.tsx`.
- [ ] **Step 4: Commit.**

### Task 5: Hasil, copy & dokumentasi

**Files:** Modify `src/pages/student/Result.tsx`, `src/lib/agnes.ts`, `src/pages/Home.tsx`, `src/components/ui.tsx`, `README.md`

**Interfaces:**
- Consumes: `answers_key_json` string dari Task 2, `canonicalAnswer` dari Task 4.

- [ ] **Step 1: `Result.tsx`** — tinjauan menampilkan jawaban teks siswa dan kunci rumus.
- [ ] **Step 2: `agnes.ts`** — prompt generik isian, hapus hardcoded "pilihan ganda"/"pecahan".
- [ ] **Step 3: `Home.tsx` & `ui.tsx`** — copy isian; ubah demo mini-assessment jadi input teks dengan `canonicalAnswer`.
- [ ] **Step 4: `README.md`** — deskripsi, urutan migration, fitur, dan aturan ekivalensi.
- [ ] **Step 5: Commit.**

### Task 6: Verifikasi akhir

- [ ] **Step 1: `npm run build`** harus lolos.
- [ ] **Step 2: `npm run typecheck`** harus lolos.
- [ ] **Step 3: `git diff --check`** tidak ada whitespace error.
- [ ] **Step 4: Commit_final.**
