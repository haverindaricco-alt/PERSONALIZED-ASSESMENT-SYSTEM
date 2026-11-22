# Soal Isian — Desain

## Intent
Mengubah asesmen dari pilihan ganda menjadi isian. Siswa mengetik jawaban akhir;
database menyimpan kunci berupa rumus/nilai plus alternatif; penilaian mengenali
bentuk setara secara sistematis. Bank soal dikosongkan.

## Goals
- Kunci dan alternatif tidak pernah dikirim ke browser.
- Ekivalensi numerik otomatis: `1/2`, `2/4`, `0,5` harus setara.
- Case-insensitive, spasi diabaikan; makna yang sama diterima.
- Arsitektur existing (token, timer, focus lock, Agnes, grading server-side) tetap.

## Non-goals
- Penilaian oleh AI.
- Evaluasi ekspresi seperti `1/2 + 1/3` (siswa menulis nilai akhir).
- Pembuangan satuan otomatis; satuan dimasukkan sebagai alternatif.
- Menghapus `results` lama.

## Model data
`questions`: hapus `option_a`–`option_e` dan `correct_answer`; tambah
`answer_key text not null`, `answer_alternatives text[] not null default '{}'`.
`questions_public`: hanya `id, question_number, question_text, indicator`.
`answers_json`: id soal -> teks jawaban. `answers_key_json`: id soal -> teks kunci.

## Aturan kanonik (`canonical_answer(text)` di PL/pgSQL)
1. lowercase, rapikan spasi, koma desimal -> titik, frasa pecahan Unicode dipetakan.
2. Bilangan bulat/desimal/pecahan `a/b`/campuran `1 1/2` -> `round(nilai, 3)::text`.
3. Teks lain -> huruf/digit lowercase tanpa spasi/tanda baca (sinonim).
4. `grade_and_save` membandingkan kanonik jawaban dengan kanonik kunci atau alternatif.

Keputusan: presisi 3 desimal; `0,83` untuk `5/6` tetap salah, `0,833` benar.

## Migration
- `schema.sql`: skema baru, tanpa seed soal.
- `security-patch.sql`: kolom baru bila belum ada, view baru, `canonical_answer`,
  `grade_and_save` baru, hapus backfill lama.
- `supabase/migration-fill-in.sql`: hapus kolom lama, `delete from questions`.
- Existing DB: jalankan migration lalu patch. Fresh DB: schema lalu patch.

## UI
- Quiz: input teks per soal, tanpa auto-advance/pintasan A-E, Enter = next.
- Admin: field kunci + daftar alternatif.
- Result: tampilkan teks siswa dan rumus kunci.
- Copy: prompt Agnes, beranda, demo mini-assessment, README.
