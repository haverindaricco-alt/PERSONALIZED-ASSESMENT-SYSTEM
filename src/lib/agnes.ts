import type {
  ClassReport,
  ResultRow,
  StudentAnalysis,
  StudentAnalysisInput,
} from "../types";
import type { ClassOverview } from "./analysis";
import {
  buildClassPromptData,
  parseClassReport,
  parseStudentAnalysis,
  statusFromPercentage,
} from "./analysis";

/* ============================================================
   Agnes AI via Cloudflare Pages Function (/api/agnes-proxy).
   Produksi: kunci ADA DI SERVER (AGNES_API_KEY env Cloudflare),
   tidak pernah masuk bundle browser (SEC-05).
   Dev: bila proxy lokal belum ada, boleh memanggil langsung
   memakai VITE_AGNES_API_KEY (hanya dieksekusi saat mode dev).
   ============================================================ */

const PROXY_URL = "/api/agnes-proxy";
const TIMEOUT_MS = 45_000;
const DEFAULT_BASE = "https://apihub.agnes-ai.com/v1";
const DEFAULT_MODEL = "agnes-2.5-flash";
const MAX_USER_CHARS = 18_000;

const DEV_KEY = import.meta.env.DEV
  ? import.meta.env.VITE_AGNES_API_KEY || ""
  : "";
const DEV_BASE = import.meta.env.DEV
  ? import.meta.env.VITE_AGNES_BASE_URL || DEFAULT_BASE
  : DEFAULT_BASE;
const DEV_MODEL = import.meta.env.DEV
  ? import.meta.env.VITE_AGNES_MODEL || DEFAULT_MODEL
  : DEFAULT_MODEL;

/* ============================================================
   PROMPT PER SISWA — analisis langkah + umpan balik + laporan guru
   ============================================================ */

const STUDENT_PROMPT = `PERAN
Kamu adalah asisten analisis asesmen formatif untuk materi Persamaan Garis Lurus (PGL) kelas VIII SMP. Tugasmu menganalisis jawaban dan langkah pengerjaan siswa, menyusun umpan balik personal untuk siswa, dan menyusun laporan belajar untuk guru. Kamu adalah alat bantu analisis. Kamu tidak mengambil keputusan pedagogis akhir; keputusan tindak lanjut ada pada guru.

KONTEKS ASESMEN
- Bentuk soal: isian. Siswa menuliskan seluruh rumus dan langkah pengerjaan, lalu jawaban akhir.
- Setiap butir soal terkait dengan satu indikator. Soal diacak per siswa, jadi gunakan hanya data butir yang dikirim, bukan urutan nomor.
- Tujuh indikator penguasaan PGL:
  I1. Menentukan gradien berdasarkan informasi yang diberikan (persamaan garis atau grafik).
  I2. Menentukan gradien berdasarkan dua titik koordinat.
  I3. Menentukan persamaan garis lurus berdasarkan gradien dan titik yang diketahui.
  I4. Menentukan persamaan garis lurus berdasarkan dua titik.
  I5. Menentukan hubungan dua garis (sejajar atau tegak lurus) berdasarkan nilai gradien.
  I6. Menginterpretasikan hubungan antara persamaan garis lurus dan grafik.
  I7. Menyelesaikan permasalahan kontekstual yang berkaitan dengan persamaan garis lurus.
- Rumus acuan: y = mx + c; m = (y2 − y1)/(x2 − x1); y − y1 = m(x − x1); garis sejajar m1 = m2; garis tegak lurus m1 × m2 = −1.
- Ambang penguasaan indikator: indikator dianggap dikuasai jika >= 70% butirnya benar (50-69% Perlu Diperkuat; < 50% Belum Dikuasai).
- Gunakan status benar/salah dari sistem untuk jawaban akhir. Jangan menilai ulang kunci jawaban.

LANGKAH ANALISIS (ikuti berurutan)
1. Kelompokkan butir menurut indikatornya. Hitung jumlah benar dan salah per indikator.
2. Tentukan setiap indikator: Dikuasai, Perlu Diperkuat, atau Belum Dikuasai, sesuai ambang di atas.
3. Telusuri langkah pengerjaan setiap butir, baik yang jawaban akhirnya salah maupun yang benar:
   a. Periksa langkah satu per satu dari awal. Tentukan langkah pertama yang keliru (jika ada).
   b. Perhatikan kesalahan yang terbawa. Jika langkah berikutnya benar berdasarkan hasil langkah yang sudah keliru, jangan hitung langkah itu sebagai kesalahan baru. Sebutkan bahwa kesalahan terbawa dari langkah sebelumnya.
   c. Jika jawaban akhir benar tetapi langkah atau penalarannya keliru, tidak lengkap, atau tidak masuk akal, tandai sebagai "benar tetapi proses perlu diperiksa". Jangan menyimpulkan siswa sudah paham hanya dari jawaban akhir yang benar.
   d. Jika langkah tidak ditulis, tidak terbaca, atau tidak lengkap, katakan demikian dan jangan mengarang langkah yang tidak ada.
4. Tentukan jenis kesalahan pada langkah pertama yang keliru:
   - Konseptual: pemahaman konsep tidak sesuai, misalnya gradien dianggap tinggi, panjang, titik potong sumbu, atau hasil operasi aritmetika; rumus dipertukarkan karena salah konsep; menganggap garis tegak lurus bergradien sama.
   - Prosedural: rumus yang dipilih tepat tetapi langkah atau aturan penyelesaian keliru, misalnya salah menerapkan rumus persamaan garis, salah mensubstitusi titik ke rumus, atau salah mengubah bentuk persamaan.
   - Perhitungan: rumus dan langkah tepat tetapi operasi hitung keliru, misalnya salah tanda, salah operasi pecahan, atau selisih koordinat dihitung dengan urutan yang tidak konsisten.
   - Terbawa dari langkah sebelumnya: kesalahan turunan dari langkah awal yang keliru.
   - Tidak dapat ditentukan: langkah kosong atau polanya tidak cukup untuk menentukan jenisnya.
   - Tidak ada: jika tidak ada kesalahan pada butir tersebut.
5. Perhatikan pola antarbutir. Kesalahan yang muncul sekali pada satu indikator disebut kekeliruan sesaat. Kesalahan serupa yang berulang pada butir dengan indikator yang sama (atau pada indikator yang saling terkait, misalnya I1 dan I2) mengindikasikan kesulitan atau miskonsepsi.
6. Susun umpan balik untuk siswa dan laporan untuk guru sesuai format keluaran.

PRINSIP PENYUSUNAN UMPAN BALIK UNTUK SISWA
1. Bersifat umum, komunikatif, dan padat dalam bentuk 2–3 paragraf narasi mengalir. Jangan memecah atau merinci umpan balik per butir/per indikator secara terpisah.
2. Paragraf 1 (Apresiasi & Kekuatan Umum): Beri apresiasi hangat atas usaha siswa dan sebutkan konsep atau langkah pengerjaan yang sudah dipahami dan dikerjakan dengan benar secara umum.
3. Paragraf 2 (Area Penguatan & Arahan Perbaikan): Ulas bagian atau konsep utama yang masih perlu diperkuat berdasarkan bukti langkah pengerjaan siswa (misalnya ketelitian perhitungan koordinat, penentuan gradien, atau penerapan rumus garis). Tunjukkan letak kekeliruannya secara ringkas dan berikan arahan atau tips perbaikan konkret tanpa membocorkan penyelesaian lengkap.
4. Paragraf 3 (Motivasi & Langkah Berikutnya): Berikan kalimat penyemangat yang hangat dan arahkan fokus latihan belajar selanjutnya.
5. Berfokus pada proses dan tugas, bukan pribadi siswa (hindari kata menghakimi seperti "kamu pintar" atau "kamu kurang teliti").
6. Bahasa Indonesia yang sederhana, hangat, dan mudah dipahami siswa kelas VIII SMP. Ringkas, padat, dan tidak bertele-tele.

PRINSIP UNTUK LAPORAN GURU
- Ringkas, berbasis indikator, dan dapat ditindaklanjuti.
- Tampilkan penguasaan per indikator, langkah yang keliru beserta jenis kesalahannya, pola yang berulang, dan rekomendasi tindak lanjut pembelajaran.
- Sebutkan secara terpisah butir yang benar tetapi prosesnya perlu diperiksa.
- Tandai bagian yang bersifat dugaan dengan kata "diduga" atau "kemungkinan", dan sebutkan langkah siswa yang mendasarinya.

BATASAN DAN KEHATI-HATIAN
- Langkah pengerjaan memberi bukti yang lebih kuat, tetapi alasan di balik langkah tetap tidak terlihat. Penyebab kesalahan (misalnya miskonsepsi tertentu) tetap bersifat dugaan. Gunakan kalimat seperti "kemungkinan kamu ...". Jangan menyatakannya seolah pasti.
- Jangan menyimpulkan miskonsepsi dari satu kesalahan tunggal. Gunakan istilah "indikasi miskonsepsi" hanya jika polanya berulang.
- Jika tulisan siswa ambigu atau tidak terbaca, katakan terus terang dan sarankan guru meninjau. Jangan menebak.
- Jangan menambahkan butir, indikator, atau informasi di luar data masukan. Jangan menyebut nilai atau skor yang tidak ada di data.
- Keluaran perlu ditinjau guru sebelum dipakai sebagai dasar keputusan.

FORMAT KELUARAN (JSON valid, tanpa markdown atau teks di luar JSON)
{
  "id_siswa": "...",
  "ringkasan_indikator": [
    {"indikator": "I1", "nama": "...", "benar": 0, "total": 0, "status": "Dikuasai | Perlu Diperkuat | Belum Dikuasai"}
  ],
  "analisis_butir": [
    {
      "id_butir": "...",
      "indikator": "I2",
      "jawaban_akhir": "benar | salah",
      "langkah_pertama_keliru": "kutipan atau deskripsi langkah siswa, atau null jika tidak ada",
      "jenis_kesalahan": "konseptual | prosedural | perhitungan | terbawa dari langkah sebelumnya | tidak dapat ditentukan | tidak ada",
      "catatan_proses": "mis. benar tetapi proses perlu diperiksa; langkah tidak lengkap; tulisan tidak terbaca"
    }
  ],
  "umpan_balik_siswa": {
    "ringkasan": "Teks lengkap umpan balik siswa dalam 2–3 paragraf padat (dipisahkan baris baru ganda).",
    "paragraf": [
      "Paragraf 1: Apresiasi dan hal-hal yang sudah dikerjakan dengan baik...",
      "Paragraf 2: Bagian atau konsep yang masih perlu diperkuat beserta arahan perbaikannya...",
      "Paragraf 3: Motivasi penutup dan langkah belajar selanjutnya..."
    ]
  },
  "laporan_guru": {
    "gambaran_umum": "...",
    "indikator_dikuasai": ["..."],
    "indikator_perlu_perhatian": [
      {"indikator": "...", "dugaan_jenis_kesalahan": "konseptual | prosedural | perhitungan | tidak dapat ditentukan", "bukti": "langkah siswa yang mendasari", "pola_berulang": true, "rekomendasi_tindak_lanjut": "..."}
    ],
    "butir_benar_proses_perlu_diperiksa": ["id_butir"],
    "catatan_kehati_hatian": "bagian yang perlu dikonfirmasi guru"
  }
}`;

/* ============================================================
   PROMPT TINGKAT KELAS — ringkasan untuk guru
   ============================================================ */

const CLASS_PROMPT = `PERAN
Kamu adalah asisten analisis asesmen formatif PGL kelas VIII SMP. Tugasmu menyusun ringkasan belajar satu kelas untuk guru berdasarkan data agregat yang diberikan. Kamu alat bantu analisis; keputusan pedagogis akhir tetap pada guru.

KONTEKS
- Data berisi agregat penguasaan per indikator, ringkasan nilai tiap siswa, status pengerjaan, dan catatan analisis per siswa bila tersedia.
- Indikator PGL: I1 gradien dari informasi yang diberikan; I2 gradien dari dua titik; I3 persamaan garis dari gradien dan titik; I4 persamaan garis dari dua titik; I5 hubungan dua garis sejajar/tegak lurus; I6 interpretasi persamaan dan grafik; I7 masalah kontekstual.
- Gunakan label indikator PERSIS seperti pada data.
- Gunakan HANYA data yang dikirim. Jangan mengarang nilai, nama siswa, butir, atau indikator.
- Sebut dugaan dengan "diduga" atau "kemungkinan" dan dasarkan pada bukti yang ada.
- Jangan menyebut siswa dengan label menghakimi. Fokus pada kebutuhan belajar.
- Ringkas, berbasis indikator, dan dapat ditindaklanjuti guru.

FORMAT KELUARAN
Balas HANYA JSON valid tanpa markdown atau teks lain:
{
  "gambaran_umum": "2-4 kalimat ringkas tentang kondisi kelas, kekuatan, dan kebutuhan utama",
  "penguasaan_indikator": [
    {"indikator": "...", "persentase": 0, "status_kelas": "Dikuasai | Perlu Diperkuat | Belum Dikuasai", "catatan": "penjelasan singkat"}
  ],
  "pola_kesalahan": [
    {"indikator": "...", "dugaan_jenis_kesalahan": "konseptual | prosedural | perhitungan | tidak dapat ditentukan", "bukti": "bukti dari data", "pola_berulang": true, "rekomendasi_tindak_lanjut": "..."}
  ],
  "siswa_perlu_perhatian": [
    {"nama": "...", "alasan": "alasan berbasis data"}
  ],
  "rekomendasi_pembelajaran": ["langkah konkret untuk pertemuan berikutnya"],
  "catatan_kehati_hatian": "bagian yang perlu dikonfirmasi guru"
}`;

/* ---------- Pemanggilan API ---------- */

interface ChatChoice {
  message?: { content?: string };
}

interface ChatResponse {
  choices?: ChatChoice[];
}

async function chatComplete(
  system: string,
  user: string,
  maxTokens: number,
): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const payload = {
    temperature: 0.2,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  try {
    try {
      const res = await fetch(PROXY_URL, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Proxy merespons ${res.status}`);
      const data = (await res.json()) as { content?: string };
      return (data.content || "").trim();
    } catch (err) {
      if (!import.meta.env.DEV || !DEV_KEY) throw err;
      const res = await fetch(`${DEV_BASE}/chat/completions`, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEV_KEY}`,
        },
        body: JSON.stringify({ ...payload, model: DEV_MODEL }),
      });
      if (!res.ok) throw new Error(`Agnes API merespons ${res.status}`);
      const data = (await res.json()) as ChatResponse;
      return (data.choices?.[0]?.message?.content || "").trim();
    }
  } finally {
    clearTimeout(timer);
  }
}

/** Jaga agar data siswa tetap di bawah batas proxy tanpa memotong JSON. */
function fitStudentData(input: StudentAnalysisInput): string {
  let current = input;
  let json = JSON.stringify(current);
  while (json.length > MAX_USER_CHARS && current.daftar_butir.length > 1) {
    current = {
      ...current,
      daftar_butir: current.daftar_butir.slice(0, -1),
    };
    json = JSON.stringify(current);
  }
  return json;
}

function fallbackStudentAnalysis(
  input: StudentAnalysisInput,
): StudentAnalysis {
  const weak = input.ringkasan_indikator.filter((i) => i.status !== "Dikuasai");
  const focus = weak.length > 0 ? weak : input.ringkasan_indikator;
  const strong = [...input.ringkasan_indikator]
    .sort((a, b) => b.persentase - a.persentase)
    .filter((i) => i.total > 0);

  const pembuka =
    input.nilai >= 70
      ? `Kerja bagus, ${input.nama}! Kamu sudah menunjukkan penguasaan yang baik pada sebagian besar materi. Berikut bagian yang masih bisa dipertajam.`
      : `Terima kasih sudah mengerjakan, ${input.nama}. Setiap langkah yang kamu tulis membantu kami melihat bagian mana yang perlu diperkuat.`;

  const per_indikator = focus.map((i) => ({
    indikator: i.indikator,
    yang_sudah_baik:
      i.benar > 0
        ? `${i.benar} dari ${i.total} butir pada indikator ini sudah benar.`
        : "Kamu sudah berusaha menuliskan jawaban; ini titik awal yang bisa dikembangkan.",
    yang_perlu_diperkuat:
      i.benar < i.total
        ? `${i.total - i.benar} butir pada indikator ini belum tepat. Periksa kembali langkah awal dan operasi hitungmu.`
        : "Tidak ada butir yang salah pada indikator ini.",
    kemungkinan_penyebab:
      "Belum dapat dipastikan tanpa pemeriksaan langkah oleh guru.",
    langkah_perbaikan: [
      `Pelajari ulang konsep ${i.indikator} dan tuliskan rumus yang dipakai sebelum menghitung.`,
      `Kerjakan 2-3 soal serupa, lalu bandingkan langkahmu dengan contoh pada buku.`,
    ],
    petunjuk: `Pada soal ${i.indikator}, langkah mana yang menurutmu paling perlu diperiksa kembali?`,
  }));

  const analisis_butir = input.daftar_butir.map((item) => ({
    id_butir: item.id_butir,
    indikator: item.indikator,
    jawaban_akhir: item.status_benar_salah,
    langkah_pertama_keliru: null,
    jenis_kesalahan: "tidak dapat ditentukan",
    catatan_proses:
      item.status_benar_salah === "benar"
        ? "Jawaban akhir benar; proses belum dianalisis otomatis."
        : "Analisis langkah otomatis belum tersedia; guru perlu meninjau.",
  }));

  return {
    version: 2,
    id_siswa: input.id_siswa,
    ringkasan_indikator: input.ringkasan_indikator.map((i) => ({
      indikator: i.indikator,
      nama: i.nama,
      benar: i.benar,
      total: i.total,
      status: i.status,
    })),
    analisis_butir,
    umpan_balik_siswa: {
      pembuka,
      per_indikator,
      penutup:
        focus.length > 0
          ? `Fokus pada satu atau dua bagian dahulu, lalu ukur kemajuanmu dengan latihan berikutnya. Kamu bisa melakukannya bertahap.`
          : "Pertahankan cara belajarmu dan coba tantangan soal yang lebih bervariasi.",
    },
    laporan_guru: {
      gambaran_umum:
        `Nilai ${input.nilai} dari 100 dengan ${input.jumlah_benar} benar dan ${input.jumlah_salah} salah. ` +
        (strong[0]
          ? `Penguasaan tertinggi pada ${strong[0].indikator} (${Math.round(strong[0].persentase)}%).`
          : "Belum ada data indikator."),
      indikator_dikuasai: input.ringkasan_indikator
        .filter((i) => i.status === "Dikuasai")
        .map((i) => i.indikator),
      indikator_perlu_perhatian: weak.map((i) => ({
        indikator: i.indikator,
        dugaan_jenis_kesalahan: "tidak dapat ditentukan",
        bukti: `${i.benar}/${i.total} butir benar.`,
        pola_berulang: i.total > 1 && i.benar === 0,
        rekomendasi_tindak_lanjut: `Tinjau langkah siswa pada ${i.indikator} dan beri latihan terbimbing.`,
      })),
      butir_benar_proses_perlu_diperiksa: [],
      catatan_kehati_hatian:
        "Ringkasan ini dibuat tanpa analisis langkah AI. Guru perlu meninjau jawaban siswa secara langsung.",
    },
    generated_at: new Date().toISOString(),
  };
}

/** Analisis satu siswa. Selalu mengembalikan struktur yang aman dipakai UI. */
export async function analyzeStudent(
  input: StudentAnalysisInput,
): Promise<StudentAnalysis> {
  try {
    const raw = await chatComplete(STUDENT_PROMPT, fitStudentData(input), 4000);
    const parsed = parseStudentAnalysis(raw);
    if (parsed) {
      return {
        ...parsed,
        id_siswa: input.id_siswa,
        version: 2,
        generated_at: new Date().toISOString(),
      };
    }
  } catch {
    /* fallback deterministik di bawah */
  }
  return fallbackStudentAnalysis(input);
}

function fallbackClassReport(
  token: string,
  overview: ClassOverview,
): ClassReport {
  const weak = [...overview.indicators]
    .filter((i) => i.percentage < 70)
    .sort((a, b) => a.percentage - b.percentage);
  const strongest = [...overview.indicators].sort(
    (a, b) => b.percentage - a.percentage,
  )[0];

  return {
    version: 2,
    token,
    jumlah_siswa: overview.students,
    gambaran_umum:
      `Kelas terdiri dari ${overview.students} siswa dengan rata-rata nilai ` +
      `${overview.averageScore.toLocaleString("id-ID", {
        maximumFractionDigits: 2,
      })}. ` +
      (strongest
        ? `Penguasaan kelas tertinggi pada ${strongest.indicator} (${Math.round(
            strongest.percentage,
          )}%).`
        : "Belum ada data indikator.") +
      (weak[0]
        ? ` Indikator yang paling perlu perhatian adalah ${weak[0].indicator} (${Math.round(
            weak[0].percentage,
          )}%).`
        : ""),
    penguasaan_indikator: overview.indicators.map((i) => ({
      indikator: i.indicator,
      persentase: Math.round(i.percentage * 10) / 10,
      status_kelas: statusFromPercentage(i.percentage),
      catatan: `${i.correct}/${i.total} butir benar; ${i.studentsMastered} siswa mencapai ambang 70%.`,
    })),
    pola_kesalahan: overview.patterns,
    siswa_perlu_perhatian: overview.attention.slice(0, 10),
    rekomendasi_pembelajaran:
      weak.length > 0
        ? [
            `Ulangi konsep dasar ${weak[0].indicator} dengan contoh terbimbing sebelum latihan mandiri.`,
            "Bahas dua atau tiga kesalahan langkah yang paling sering muncul, tanpa menyebut nama siswa.",
            "Beri latihan singkat serupa dan periksa langkah awal siswa, bukan hanya jawaban akhir.",
          ]
        : [
            "Pertahankan penguasaan dengan soal penerapan yang lebih bervariasi.",
            "Beri tantangan kontekstual untuk menguatkan penalaran.",
          ],
    catatan_kehati_hatian:
      overview.analyzed > 0
        ? `Ringkasan memakai ${overview.analyzed} analisis siswa yang tersedia. Dugaan penyebab kesalahan tetap perlu dikonfirmasi guru.`
        : "Belum ada analisis langkah per siswa. Ringkasan disusun dari data benar/salah saja.",
    generated_at: new Date().toISOString(),
  };
}

/** Ringkasan satu kelas untuk guru. */
export async function summarizeClass(
  token: string,
  results: ResultRow[],
  overview: ClassOverview,
): Promise<ClassReport> {
  const data = buildClassPromptData(token, results, overview);
  try {
    const raw = await chatComplete(
      CLASS_PROMPT,
      data.slice(0, MAX_USER_CHARS),
      3000,
    );
    const parsed = parseClassReport(raw, token, overview.students);
    if (parsed) {
      /* Jangan biarkan AI menambah indikator/siswa yang tidak ada di data. */
      const knownIndicators = new Set(
        overview.indicators.map((i) => i.indicator),
      );
      if (knownIndicators.size > 0) {
        parsed.penguasaan_indikator = parsed.penguasaan_indikator.filter((i) =>
          knownIndicators.has(i.indikator),
        );
        parsed.pola_kesalahan = parsed.pola_kesalahan.filter((p) =>
          knownIndicators.has(p.indikator),
        );
      }

      const knownStudents = new Set(
        results.map((r) => r.student_name.toLowerCase().trim()),
      );
      parsed.siswa_perlu_perhatian = parsed.siswa_perlu_perhatian.filter(
        (s) => knownStudents.has(s.nama.toLowerCase().trim()),
      );

      /* Pastikan semua indikator pada data tetap muncul. */
      const known = new Set(
        parsed.penguasaan_indikator.map((i) => i.indikator),
      );
      for (const i of overview.indicators) {
        if (!known.has(i.indicator)) {
          parsed.penguasaan_indikator.push({
            indikator: i.indicator,
            persentase: Math.round(i.percentage * 10) / 10,
            status_kelas: statusFromPercentage(i.percentage),
            catatan: `${i.correct}/${i.total} butir benar.`,
          });
        }
      }
      return parsed;
    }
  } catch {
    /* fallback deterministik */
  }
  return fallbackClassReport(token, overview);
}
