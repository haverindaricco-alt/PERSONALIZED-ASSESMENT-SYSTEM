-- ============================================================
-- Aplikasi Asesmen Diagnostik & Ujian Mandiri Online
-- Skema: settings, questions, results (Supabase PostgreSQL)
-- Jalankan file ini di: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1. TABEL SETTINGS ------------------------------------------
CREATE TABLE public.settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'AKTIF' CHECK (status IN ('AKTIF', 'TIDAK_AKTIF')),
    duration_minutes INT DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABEL QUESTIONS ------------------------------------------
-- Asesmen isian: kunci berupa rumus/nilai serta alternatif yang
-- diterima. Keduanya TIDAK pernah diekspos lewat view publik.
CREATE TABLE public.questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question_number INT NOT NULL,
    question_text TEXT NOT NULL,
    answer_key TEXT NOT NULL,
    answer_alternatives TEXT[] NOT NULL DEFAULT '{}',
    indicator VARCHAR(100) DEFAULT 'Umum',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABEL RESULTS ---------------------------------------------
CREATE TABLE public.results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_name VARCHAR(150) NOT NULL,
    token_used VARCHAR(50) NOT NULL,
    score NUMERIC(5,2) NOT NULL,
    correct_count INT NOT NULL,
    wrong_count INT NOT NULL,
    total_questions INT NOT NULL,
    completion_status VARCHAR(100) NOT NULL DEFAULT 'SELESAI',
    answers_json JSONB,
    answers_correct_json JSONB,
    answers_key_json JSONB,
    indicator_summary_json JSONB,
    ai_recommendation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3b. TABEL CLASS_REPORTS (ringkasan AI tingkat kelas untuk guru) -----
CREATE TABLE public.class_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token_used TEXT NOT NULL,
    student_count INT NOT NULL DEFAULT 0,
    summary_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ROW LEVEL SECURITY ----------------------------------------
-- Aplikasi mengakses DB dengan kunci anon; security-patch.sql
-- mengganti policy ini menjadi RLS ketat + RPC penilaian.
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select" ON public.settings FOR SELECT USING (true);
CREATE POLICY "settings_update" ON public.settings FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "questions_select" ON public.questions FOR SELECT USING (true);
CREATE POLICY "questions_insert" ON public.questions FOR INSERT WITH CHECK (true);
CREATE POLICY "questions_update" ON public.questions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "questions_delete" ON public.questions FOR DELETE USING (true);

CREATE POLICY "results_select" ON public.results FOR SELECT USING (true);
CREATE POLICY "results_insert" ON public.results FOR INSERT WITH CHECK (true);
CREATE POLICY "results_update" ON public.results FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "class_reports_select" ON public.class_reports FOR SELECT USING (true);
CREATE POLICY "class_reports_insert" ON public.class_reports FOR INSERT WITH CHECK (true);

CREATE VIEW public.questions_public AS
    SELECT id, question_number, question_text, indicator
    FROM public.questions;

GRANT SELECT ON public.questions_public TO anon, authenticated;

-- 5. SEED: PENGATURAN UJIAN -------------------------------------
INSERT INTO public.settings (token, status, duration_minutes)
VALUES ('UJIAN2026', 'AKTIF', 30);

-- 6. BANK SOAL --------------------------------------------------
-- Sengaja dikosongkan. Tambahkan soal lewat Dashboard > Bank Soal.
