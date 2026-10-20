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
    admin_pin VARCHAR(20) DEFAULT 'ADMIN2026',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABEL QUESTIONS ------------------------------------------
CREATE TABLE public.questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question_number INT NOT NULL,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    option_e TEXT NOT NULL,
    correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D', 'E')),
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
    indicator_summary_json JSONB,
    ai_recommendation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ROW LEVEL SECURITY ----------------------------------------
-- Aplikasi ini mengakses DB dengan kunci anon (public) jadi semua
-- policinya permissive. Lapisan akses: token ujian untuk siswa,
-- PIN admin untuk pengawas (divalidasi di aplikasi).
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select" ON public.settings FOR SELECT USING (true);
CREATE POLICY "settings_update" ON public.settings FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "questions_select" ON public.questions FOR SELECT USING (true);
CREATE POLICY "questions_insert" ON public.questions FOR INSERT WITH CHECK (true);
CREATE POLICY "questions_update" ON public.questions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "questions_delete" ON public.questions FOR DELETE USING (true);

CREATE POLICY "results_select" ON public.results FOR SELECT USING (true);
CREATE POLICY "results_insert" ON public.results FOR INSERT WITH CHECK (true);

-- 5. SEED: PENGATURAN UJIAN -------------------------------------
INSERT INTO public.settings (token, status, duration_minutes, admin_pin)
VALUES ('UJIAN2026', 'AKTIF', 30, 'ADMIN2026');

-- 6. SEED: BANK SOAL MATEMATIKA (MATERI PECAHAN, 10 SOAL) --------
INSERT INTO public.questions
    (question_number, question_text, option_a, option_b, option_c, option_d, option_e, correct_answer, indicator)
VALUES
    (1,
     'Hasil dari 1/2 + 1/3 adalah ...',
     '2/5', '3/5', '5/6', '1/6', '2/3',
     'C', 'Penjumlahan Pecahan'),
    (2,
     'Hasil dari 2/5 + 1/5 adalah ...',
     '3/10', '3/5', '2/5', '1/3', '4/5',
     'B', 'Penjumlahan Pecahan'),
    (3,
     'Hasil dari 3/4 - 1/4 adalah ...',
     '1/8', '1/4', '3/8', '1/2', '2/3',
     'D', 'Pengurangan Pecahan'),
    (4,
     'Hasil dari 5/6 - 1/3 adalah ...',
     '1/3', '1/2', '4/9', '5/9', '2/3',
     'B', 'Pengurangan Pecahan'),
    (5,
     'Hasil dari 1/2 kali 1/3 adalah ...',
     '1/6', '2/5', '1/5', '2/3', '5/6',
     'A', 'Perkalian Pecahan'),
    (6,
     'Hasil dari 2/3 kali 3/4 adalah ...',
     '5/12', '5/8', '1/2', '3/8', '3/4',
     'C', 'Perkalian Pecahan'),
    (7,
     'Hasil dari 1/2 : 1/4 adalah ...',
     '1/8', '2', '1/2', '8', '4',
     'B', 'Pembagian Pecahan'),
    (8,
     'Hasil dari 3/4 : 1/8 adalah ...',
     '6', '3/32', '2/3', '12', '1/12',
     'A', 'Pembagian Pecahan'),
    (9,
     'Hasil dari 1/4 + 1/4 + 1/4 adalah ...',
     '1/2', '2/3', '5/8', '3/4', '1',
     'D', 'Penjumlahan Pecahan'),
    (10,
     'Andi memiliki 3/4 liter jus yang dibagikan sama rata ke dalam 6 gelas. Setiap gelas berisi jus sebanyak ... liter.',
     '1/4', '1/12', '3/8', '1/16', '1/8',
     'E', 'Pembagian Pecahan');
