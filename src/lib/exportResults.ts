import type { ResultRow } from "../types";
import { formatIdDateTime } from "./scoring";
import { parseStudentAnalysis } from "./analysis";

const BORDER = "#D2D2D7";
const HEADER_FILL = "#F5F5F7";

function feedbackForExcel(result: ResultRow): string {
  const analysis = parseStudentAnalysis(result.ai_recommendation);
  if (!analysis) return result.ai_recommendation ?? "";
  const lines: string[] = [];
  if (analysis.umpan_balik_siswa.pembuka) {
    lines.push(analysis.umpan_balik_siswa.pembuka);
  }
  for (const item of analysis.umpan_balik_siswa.per_indikator) {
    const parts = [`${item.indikator}:`];
    if (item.yang_sudah_baik) parts.push(`sudah baik: ${item.yang_sudah_baik}`);
    if (item.yang_perlu_diperkuat) {
      parts.push(`perlu diperkuat: ${item.yang_perlu_diperkuat}`);
    }
    lines.push(parts.join(" "));
  }
  if (analysis.umpan_balik_siswa.penutup) {
    lines.push(analysis.umpan_balik_siswa.penutup);
  }
  return lines.join("\n");
}

/** Ekspor hasil ujian ke file .xlsx asli yang bisa dibuka Excel,
    Google Sheets, atau LibreOffice. */
export async function exportResultsToExcel(
  rows: ResultRow[],
  scopeLabel = "semua",
): Promise<void> {
  const header = [
    "No",
    "Nama",
    "Token",
    "Nilai",
    "Benar",
    "Salah",
    "Total Soal",
    "Feedback Murid",
    "Status",
    "Waktu",
  ].map((value) => ({
    value,
    fontWeight: "bold" as const,
    align: "center" as const,
    backgroundColor: HEADER_FILL,
    textColor: "#1D1D1F",
    borderColor: BORDER,
    borderStyle: "thin" as const,
    wrap: true,
  }));

  const body = rows.map((r, index) => [
    {
      value: index + 1,
      type: Number,
      align: "center" as const,
      borderColor: BORDER,
      borderStyle: "thin" as const,
    },
    {
      value: r.student_name,
      borderColor: BORDER,
      borderStyle: "thin" as const,
      wrap: true,
    },
    {
      value: r.token_used,
      align: "center" as const,
      borderColor: BORDER,
      borderStyle: "thin" as const,
    },
    {
      value: r.score,
      type: Number,
      format: "0.00",
      align: "center" as const,
      borderColor: BORDER,
      borderStyle: "thin" as const,
    },
    {
      value: r.correct_count,
      type: Number,
      align: "center" as const,
      borderColor: BORDER,
      borderStyle: "thin" as const,
    },
    {
      value: r.wrong_count,
      type: Number,
      align: "center" as const,
      borderColor: BORDER,
      borderStyle: "thin" as const,
    },
    {
      value: r.total_questions,
      type: Number,
      align: "center" as const,
      borderColor: BORDER,
      borderStyle: "thin" as const,
    },
    {
      value: feedbackForExcel(r),
      borderColor: BORDER,
      borderStyle: "thin" as const,
      wrap: true,
    },
    {
      value: r.completion_status,
      borderColor: BORDER,
      borderStyle: "thin" as const,
      wrap: true,
    },
    {
      value: formatIdDateTime(r.created_at),
      borderColor: BORDER,
      borderStyle: "thin" as const,
      wrap: true,
    },
  ]);

  const stamp = new Date().toISOString().slice(0, 10);
  /* Library Excel dimuat saat dibutuhkan agar bundel awal tetap ringan. */
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const result = writeXlsxFile([header, ...body], {
    sheet: "Rekap Nilai",
    columns: [
      { width: 6 },
      { width: 28 },
      { width: 14 },
      { width: 10 },
      { width: 9 },
      { width: 9 },
      { width: 12 },
      { width: 60 },
      { width: 30 },
      { width: 22 },
    ],
  });

  await result.toFile(`rekap-nilai-${scopeLabel}-${stamp}.xlsx`);
}
