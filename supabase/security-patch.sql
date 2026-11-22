-- ============================================================
-- SECURITY PATCH — Personalized Assessment System
-- Jalankan SELURUH file ini berurutan di:
--   Supabase Dashboard > SQL Editor > New Query
--
-- PRASYARAT (lakukan dulu, sebelum menjalankan patch):
--   1. Supabase Dashboard > Authentication > Users > Add user
--      -> buat 1 akun admin (email + password).
--   2. Deploy kode aplikasi versi baru bersamaan dengan patch ini
--      (admin login memakai email/password, kolom PIN dihilangkan).
--
-- Dampak:
--   - Tamu anonim: hanya baca token/status/durasi + soal (tanpa kunci),
--     hanya menulis hasil lewat RPC; tidak bisa ubah settings/soal,
--     tidak bisa membaca daftar hasil seluruh siswa.
--   - Admin (user authenticated Supabase): CRUD penuh settings/soal,
--     baca seluruh hasil.
--   - Kolom admin_pin DIHAPUS (bukan lagi mekanisme login).
-- ============================================================

-- 0. Buang fungsi PIN lama dan kolom PIN (auth pindah ke Supabase Auth)
drop function if exists public.verify_admin_pin(text);
alter table public.settings drop column if exists admin_pin;

-- 1. SETTINGS --------------------------------------------------
-- Baca (kolom terbatas) untuk anon; tulis hanya untuk authenticated.
drop policy if exists "settings_select" on public.settings;
drop policy if exists "settings_update" on public.settings;
drop policy if exists "settings_read_anon" on public.settings;
drop policy if exists "settings_admin_all" on public.settings;
revoke all on public.settings from anon, authenticated;
grant select (id, token, status, duration_minutes, created_at)
  on public.settings to anon;
grant all on public.settings to authenticated;

create policy "settings_read_anon"
  on public.settings for select to anon using (true);

create policy "settings_admin_all"
  on public.settings to authenticated
  using (true) with check (true);

-- 2. QUESTIONS -------------------------------------------------
-- Tamu tidak punya akses langsung ke tabel soal (SEC-02);
-- siswa membaca lewat view tanpa kunci/rumus jawaban (SEC-06).
drop policy if exists "questions_select" on public.questions;
drop policy if exists "questions_insert" on public.questions;
drop policy if exists "questions_update" on public.questions;
drop policy if exists "questions_delete" on public.questions;
drop policy if exists "questions_admin_all" on public.questions;
revoke all on public.questions from anon;
grant all on public.questions to authenticated;

create policy "questions_admin_all"
  on public.questions to authenticated
  using (true) with check (true);

-- Kolom kunci untuk asesmen isian (aman bila sudah ada).
alter table public.questions add column if not exists answer_key text;
alter table public.questions add column if not exists
  answer_alternatives text[] not null default '{}';

-- CREATE OR REPLACE VIEW tidak boleh mengurangi kolom, jadi view dibuat ulang.
drop view if exists public.questions_public;
create view public.questions_public as
  select id, question_number, question_text, indicator
  from public.questions;

grant select on public.questions_public to anon, authenticated;

-- 3. RESULTS ---------------------------------------------------
-- Tamu tidak punya akases langsung; grading + baca-milik via RPC
-- (SEC-02: daftar nama/hasil seluruh siswa tidak lagi terbaca tamu).
drop policy if exists "results_insert" on public.results;
drop policy if exists "results_select" on public.results;
drop policy if exists "results_admin_read" on public.results;
revoke all on public.results from anon;
grant all on public.results to authenticated;

create policy "results_admin_read"
  on public.results to authenticated using (true);

alter table public.results add column if not exists answers_correct_json jsonb;
alter table public.results add column if not exists answers_key_json jsonb;

-- Backfill lama tidak dipakai lagi: bank soal dikosongkan dan kunci
-- sekarang berupa teks rumus, bukan huruf pilihan ganda.

-- 4. FUNGSI PEMBAKU JAWABAN ------------------------------------
-- Menyetarakan bentuk jawaban agar 1/2, 2/4, dan 0,5 menghasilkan
-- kanonik yang sama. Teks non-numerik dibakukan jadi huruf/digit
-- tanpa spasi, sehingga "Lima Per Enam" cocok dengan alternatifnya.
create or replace function public.canonical_answer(p_text text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  s text;
  parts text[];
  num numeric;
  den numeric;
  whole numeric;
  v numeric;
begin
  s := lower(coalesce(p_text, ''));
  s := replace(s, chr(9), ' ');
  s := replace(s, chr(10), ' ');
  s := replace(s, chr(13), ' ');
  s := regexp_replace(s, '\s+', ' ', 'g');
  s := btrim(s);
  if s = '' then
    return '';
  end if;

  s := replace(s, '½', '1/2');
  s := replace(s, '¼', '1/4');
  s := replace(s, '¾', '3/4');
  s := replace(s, ',', '.');
  s := btrim(s);
  -- Spasi di sekitar tanda bagi tidak mengubah makna pecahan.
  s := regexp_replace(s, '\s*/\s*', '/', 'g');

  -- Bilangan bulat atau desimal.
  if s ~ '^-?\d+(\.\d+)?$' then
    return round(s::numeric, 3)::text;
  end if;

  -- Desimal tanpa angka di depan koma: .5 / -.5 / +.5
  if s ~ '^[-+]?\.\d+$' then
    if left(s, 1) = '-' then
      s := '-0' || substring(s from 2);
    elsif left(s, 1) = '+' then
      s := '0' || substring(s from 2);
    else
      s := '0' || s;
    end if;
    return round(s::numeric, 3)::text;
  end if;

  -- Pecahan a/b, termasuk penyebut negatif.
  if s ~ '^-?\d+/-?\d+$' then
    parts := string_to_array(s, '/');
    num := parts[1]::numeric;
    den := parts[2]::numeric;
    if den = 0 then
      return '#/' || s;
    end if;
    return round(num / den, 3)::text;
  end if;

  -- Bilangan campuran, misalnya "1 1/2".
  if s ~ '^-?\d+\s+\d+/\d+$' then
    parts := regexp_match(s, '^(-?\d+)\s+(\d+)/(\d+)$');
    whole := parts[1]::numeric;
    num := parts[2]::numeric;
    den := parts[3]::numeric;
    if den = 0 then
      return '#/' || s;
    end if;
    v := case when whole < 0 then whole - num / den
              else whole + num / den end;
    return round(v, 3)::text;
  end if;

  -- Sinonim teks: huruf besar/kecil dan spasi tidak dibedakan.
  return regexp_replace(s, '[^a-z0-9]', '', 'g');
end $$;

-- 5. RPC: grading server-side ---------------------------------
-- Kunci tidak pernah dikirim ke browser; jawaban siswa dibandingkan
-- dengan kanonik kunci ATAU salah satu alternatif (SEC-06, RACE-01).
create or replace function public.grade_and_save(
  p_token text, p_student text, p_answers jsonb, p_status text)
returns public.results
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sid uuid;
  v_token text;
  v_row public.results%rowtype;
begin
  if p_token is null or btrim(p_token) = '' then
    raise exception 'Token wajib diisi.';
  end if;
  if p_student is null or btrim(p_student) = ''
     or length(btrim(p_student)) < 2 or length(btrim(p_student)) > 150 then
    raise exception 'Nama siswa tidak valid.';
  end if;
  if p_status not in ('SELESAI',
                      'DIHENTIKAN - Waktu Habis',
                      'DIHENTIKAN - Pelanggaran Fokus Halaman') then
    raise exception 'Status pengerjaan tidak dikenal.';
  end if;
  if jsonb_typeof(p_answers) is distinct from 'object' then
    raise exception 'Format jawaban tidak valid.';
  end if;
  if not exists (select 1 from public.questions) then
    raise exception 'Bank soal kosong. Hubungi pengawas.';
  end if;

  select id, token into v_sid, v_token
  from public.settings
  where token = upper(btrim(p_token)) and status = 'AKTIF'
  limit 1;
  if v_sid is null then
    raise exception 'Token tidak valid atau ujian tidak aktif.';
  end if;

  insert into public.results (
    student_name, token_used, score, correct_count, wrong_count,
    total_questions, completion_status, answers_json,
    answers_correct_json, answers_key_json,
    indicator_summary_json, ai_recommendation)
  with graded as (
    select q.indicator,
           q.id::text as qid,
           q.question_number,
           q.answer_key,
           p_answers ->> q.id::text as answer,
           (p_answers ->> q.id::text) is not null
             and btrim(coalesce(q.answer_key, '')) <> ''
             and (
               public.canonical_answer(p_answers ->> q.id::text)
                 = public.canonical_answer(q.answer_key)
               or exists (
                 select 1
                 from unnest(coalesce(q.answer_alternatives, '{}'::text[])) as alt
                 where public.canonical_answer(alt)
                     = public.canonical_answer(p_answers ->> q.id::text)
               )
             ) as ok
    from public.questions q
  ),
  agg as (
    select indicator,
           count(*) as total,
           count(*) filter (where ok) as correct,
           min(question_number) as first_num
    from graded
    group by indicator
  )
  select
    btrim(p_student),
    v_token,
    round(100.0 * count(*) filter (where ok) / count(*), 2),
    count(*) filter (where ok),
    count(*) - count(*) filter (where ok),
    count(*),
    p_status,
    p_answers,
    coalesce(jsonb_object_agg(qid, ok), '{}'::jsonb),
    coalesce(jsonb_object_agg(qid, answer_key)
             filter (where answer is not null), '{}'::jsonb),
    coalesce((select jsonb_agg(
                 jsonb_build_object(
                   'indicator', indicator,
                   'total', total,
                   'correct', correct,
                   'percentage', round(100.0 * correct / total, 14))
                 order by first_num)
              from agg), '[]'::jsonb),
    ''
  from graded
  returning * into v_row;

  return v_row;
end $$;

-- 6. RPC: tempel rekomendasi AI (hanya pemilik token) ----------
create or replace function public.attach_recommendation(
  p_id uuid, p_token text, p_text text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_id is null or p_token is null
     or p_text is null or btrim(p_text) = '' then
    raise exception 'Rekomendasi tidak valid.';
  end if;
  update public.results
  set ai_recommendation = left(btrim(p_text), 5000)
  where id = p_id and token_used = upper(btrim(p_token));
end $$;

-- 7. RPC: hasil milik siswa (id + token ujian yang cocok) ------
-- Tamu tidak bisa menjelajah hasil siswa lain (SEC-02, nomor 2).
create or replace function public.get_result_for_student(
  p_id uuid, p_token text)
returns public.results
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.results%rowtype;
begin
  if p_id is null or p_token is null or btrim(p_token) = '' then
    raise exception 'Hasil tidak ditemukan. Periksa tautan/token.';
  end if;
  select * into v_row
  from public.results
  where id = p_id and token_used = upper(btrim(p_token))
  limit 1;
  if v_row.id is null then
    raise exception 'Hasil tidak ditemukan. Periksa tautan/token.';
  end if;
  return v_row;
end $$;

grant execute on function public.canonical_answer(text) to anon, authenticated;
grant execute on function public.grade_and_save(text, text, jsonb, text) to anon, authenticated;
grant execute on function public.attach_recommendation(uuid, text, text) to anon, authenticated;
grant execute on function public.get_result_for_student(uuid, text) to anon, authenticated;

-- 8. Nomor soal unik (BUG-03) ---------------------------------
-- Jika gagal karena ada duplikat nomor, rapikan dulu
--   (contoh: update questions set question_number = 11 where id = ...;)
-- lalu jalankan baris ini lagi.
create unique index if not exists questions_number_unique
  on public.questions (question_number);
