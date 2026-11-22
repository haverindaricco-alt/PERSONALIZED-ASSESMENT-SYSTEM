/** Memecah teks jawaban menjadi bagian teks biasa dan pecahan agar
    pembilang/penyebut bisa ditampilkan bertumpuk. Teks asli tetap
    dipakai untuk penilaian; fungsi ini hanya untuk tampilan. */

export type MathSegment =
  | { type: "text"; value: string }
  | { type: "fraction"; numerator: string; denominator: string };

const SIMPLE_TOKEN = "[+-]?(?:\\d+(?:[.,]\\d+)?|[A-Za-z]\\d*)";

const FRACTION_PATTERN = new RegExp(
  "\\(([^()]+)\\)\\s*/\\s*\\(([^()]+)\\)" +
    "|(?<![A-Za-z0-9])(" +
    SIMPLE_TOKEN +
    ")\\s*/\\s*(" +
    SIMPLE_TOKEN +
    ")(?![A-Za-z0-9])",
  "g",
);

export function parseMathText(input: string): MathSegment[] {
  const segments: MathSegment[] = [];
  let lastIndex = 0;

  for (const match of input.matchAll(FRACTION_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ type: "text", value: input.slice(lastIndex, index) });
    }

    segments.push({
      type: "fraction",
      numerator: match[1] ?? match[3] ?? "",
      denominator: match[2] ?? match[4] ?? "",
    });

    lastIndex = index + match[0].length;
  }

  if (lastIndex < input.length) {
    segments.push({ type: "text", value: input.slice(lastIndex) });
  }

  return segments;
}
