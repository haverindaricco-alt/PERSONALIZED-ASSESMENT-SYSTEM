-- ============================================================
-- MIGRASI: PILIHAN GANDA -> SOAL ISIAN
-- Jalankan pada database yang sudah ada, di:
--   Supabase Dashboard > SQL Editor > New Query
-- ============================================================
-- URUTAN UNTUK DATABASE LAMA:
--   1. supabase/migration-fill-in.sql   (file ini)
--   2. supabase/security-patch.sql      (view + fungsi penilaian baru)
--
-- DATABASE BARU: cukup jalankan schema.sql lalu security-patch.sql.
--
-- PERINGATAN: file ini MENGOSONGKAN seluruh bank soal. Sesuai permintaan,
-- bank akan diisi ulang dari Dashboard > Bank Soal. Tabel results sengaja
-- tidak dihapus.
-- ============================================================

drop view if exists public.questions_public;

alter table public.questions drop column if exists option_a;
alter table public.questions drop column if exists option_b;
alter table public.questions drop column if exists option_c;
alter table public.questions drop column if exists option_d;
alter table public.questions drop column if exists option_e;
alter table public.questions drop column if exists correct_answer;

delete from public.questions;

-- Biarkan tampilan tetap bisa dipakai bila patch belum dijalankan.
create view public.questions_public as
  select id, question_number, question_text, indicator
  from public.questions;

grant select on public.questions_public to anon, authenticated;
