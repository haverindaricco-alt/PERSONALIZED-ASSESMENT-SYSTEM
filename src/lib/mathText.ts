/** Memecah teks jawaban menjadi bagian teks biasa dan pecahan agar
    pembilang/penyebut bisa ditampilkan bertumpuk. Teks asli tetap
    dipakai untuk penilaian; fungsi ini hanya untuk tampilan. */

export type MathSegment =
  | { type: "text"; value: string }
  | { type: "fraction"; numerator: string; denominator: string };

const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉";

const VULGAR_FRACTIONS: Record<string, string> = {
  "½": "1/2",
  "⅓": "1/3",
  "⅔": "2/3",
  "¼": "1/4",
  "¾": "3/4",
  "⅕": "1/5",
  "⅖": "2/5",
  "⅗": "3/5",
  "⅘": "4/5",
  "⅙": "1/6",
  "⅚": "5/6",
  "⅛": "1/8",
  "⅜": "3/8",
  "⅝": "5/8",
  "⅞": "7/8",
};

/** Mencari batas penutup tanda kurung/siku berimbang yang cocok dengan karakter pembuka di indeks `start`. */
export function findBalancedDelimiter(
  str: string,
  start: number,
): { inner: string; end: number; open: string; close: string } | null {
  const open = str[start];
  const close =
    open === "(" ? ")" : open === "[" ? "]" : open === "{" ? "}" : null;
  if (!close) return null;

  const stack: string[] = [close];
  for (let i = start + 1; i < str.length; i++) {
    const ch = str[i];
    if (ch === "(") stack.push(")");
    else if (ch === "[") stack.push("]");
    else if (ch === "{") stack.push("}");
    else if (ch === stack[stack.length - 1]) {
      stack.pop();
      if (stack.length === 0) {
        return { inner: str.slice(start + 1, i), end: i + 1, open, close };
      }
    }
  }
  return null;
}

/** Menghapus pembungkus kurung atau kurung siku terluar bila seluruh teks terbungkus rapi. */
export function stripOuterDelimiters(str: string): string {
  const trimmed = str.trim();
  if (
    (trimmed.startsWith("(") && trimmed.endsWith(")")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
    (trimmed.startsWith("{") && trimmed.endsWith("}"))
  ) {
    const res = findBalancedDelimiter(trimmed, 0);
    if (res && res.end === trimmed.length) {
      return stripOuterDelimiters(res.inner);
    }
  }
  return trimmed;
}

/** Menormalkan teks matematika yang diketik atau di-copy dari sumber lain:
    - Pangkat bawah (y₂) menjadi angka biasa (y2)
    - Unicode fraction slash (⁄, ∕) menjadi '/'
    - Simbol pecahan Unicode (½, ¾) menjadi 1/2, 3/4
    - Format pecahan baris ganda (pembilang di atas, garis pembagi, penyebut di bawah)
    - Format LaTeX \frac{a}{b}, \dfrac{a}{b}, \tfrac{a}{b} menjadi (a)/(b)
    - Pecahan bersiku [a]/[b] menjadi (a)/(b) */
export function normalizePastedMath(input: string): string {
  if (!input) return "";
  let s = input;

  // 1. Pangkat bawah ke angka biasa
  s = s.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (ch) =>
    String(SUBSCRIPT_DIGITS.indexOf(ch)),
  );

  // 2. Unicode slashes dan pecahan vulgar
  s = s.replace(/[⁄∕]/g, "/");
  s = s.replace(/[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g, (ch) => VULGAR_FRACTIONS[ch] || ch);

  // 3. Pecahan multiline (misalnya copy dari dokumen Word atau situs web)
  s = s.replace(
    /([^\r\n]+)\r?\n\s*[-=─—]{3,}\s*\r?\n([^\r\n]+)/g,
    (_, rawNum: string, rawDen: string) => {
      const num = rawNum.trim();
      const den = rawDen.trim();
      const atomicNum =
        /^[A-Za-z0-9]+$/.test(num) || /^[+-]?\d+$/.test(num);
      const atomicDen =
        /^[A-Za-z0-9]+$/.test(den) || /^[+-]?\d+$/.test(den);
      const n = atomicNum ? num : `(${stripOuterDelimiters(num)})`;
      const d = atomicDen ? den : `(${stripOuterDelimiters(den)})`;
      return `${n}/${d}`;
    },
  );

  // 4. LaTeX fractions: \frac{a}{b}, \dfrac{a}{b}, \tfrac{a}{b}
  let prev = "";
  let safety = 0;
  while (s !== prev && safety < 20) {
    prev = s;
    safety++;
    s = s.replace(
      /\\(?:frac|dfrac|tfrac)\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g,
      (_, rawNum: string, rawDen: string) => {
        const num = rawNum.trim().replace(/^\\left\(|\\right\)$/g, "");
        const den = rawDen.trim().replace(/^\\left\(|\\right\)$/g, "");
        const atomicNum =
          /^[A-Za-z0-9]+$/.test(num) || /^[+-]?\d+$/.test(num);
        const atomicDen =
          /^[A-Za-z0-9]+$/.test(den) || /^[+-]?\d+$/.test(den);
        const n = atomicNum ? num : `(${stripOuterDelimiters(num)})`;
        const d = atomicDen ? den : `(${stripOuterDelimiters(den)})`;
        return `${n}/${d}`;
      },
    );
  }

  // 5. Normalisasi kurung siku pada pecahan: [-8-7]/[3-(-2)] -> (-8-7)/(3-(-2))
  s = s.replace(/\[([^[\]]+)\]\s*\/\s*\[([^[\]]+)\]/g, "($1)/($2)");
  s = s.replace(/\[([^[\]]+)\]\s*\/\s*\(([^()]+)\)/g, "($1)/($2)");
  s = s.replace(/\(([^()]+)\)\s*\/\s*\[([^[\]]+)\]/g, "($1)/($2)");

  return s;
}

/** Mengubah pangkat bawah dan menormalkan pecahan teks. */
export function normalizeMathText(value: string): string {
  return normalizePastedMath(value);
}

const SIMPLE_TOKEN_RE = /^[+-]?(?:\d+(?:[.,]\d+)?|[A-Za-z]\d*)/;

export function parseMathText(input: string): MathSegment[] {
  const segments: MathSegment[] = [];
  let i = 0;
  const len = input.length;
  let textBuffer = "";

  const flushText = () => {
    if (textBuffer) {
      segments.push({ type: "text", value: textBuffer });
      textBuffer = "";
    }
  };

  while (i < len) {
    // 1. Check LaTeX \frac, \dfrac, \tfrac
    const fracMatch = input.slice(i).match(/^\\?(?:frac|dfrac|tfrac)\s*/);
    if (fracMatch && (input[i] === "\\" || i === 0 || /\s/.test(input[i - 1]))) {
      let cursor = i + fracMatch[0].length;
      if (
        cursor < len &&
        (input[cursor] === "{" || input[cursor] === "[" || input[cursor] === "(")
      ) {
        const numRes = findBalancedDelimiter(input, cursor);
        if (numRes) {
          cursor = numRes.end;
          while (cursor < len && /\s/.test(input[cursor])) cursor++;
          if (
            cursor < len &&
            (input[cursor] === "{" || input[cursor] === "[" || input[cursor] === "(")
          ) {
            const denRes = findBalancedDelimiter(input, cursor);
            if (denRes) {
              flushText();
              segments.push({
                type: "fraction",
                numerator: numRes.inner.trim(),
                denominator: denRes.inner.trim(),
              });
              i = denRes.end;
              continue;
            }
          }
        }
      }
    }

    // 2. Delimited numerator: (...) or [...]
    if (input[i] === "(" || input[i] === "[") {
      const numRes = findBalancedDelimiter(input, i);
      if (numRes) {
        let cursor = numRes.end;
        while (cursor < len && /\s/.test(input[cursor])) cursor++;
        if (cursor < len && input[cursor] === "/") {
          cursor++; // skip '/'
          while (cursor < len && /\s/.test(input[cursor])) cursor++;
          if (cursor < len) {
            // Denominator delimited: (...) or [...]
            if (input[cursor] === "(" || input[cursor] === "[") {
              const denRes = findBalancedDelimiter(input, cursor);
              if (denRes) {
                flushText();
                segments.push({
                  type: "fraction",
                  numerator: numRes.inner.trim(),
                  denominator: denRes.inner.trim(),
                });
                i = denRes.end;
                continue;
              }
            } else {
              // Denominator simple token:
              const denMatch = input.slice(cursor).match(SIMPLE_TOKEN_RE);
              if (denMatch && denMatch[0].length > 0) {
                const denEnd = cursor + denMatch[0].length;
                if (denEnd >= len || !/[A-Za-z0-9]/.test(input[denEnd])) {
                  flushText();
                  segments.push({
                    type: "fraction",
                    numerator: numRes.inner.trim(),
                    denominator: denMatch[0].trim(),
                  });
                  i = denEnd;
                  continue;
                }
              }
            }
          }
        }
      }
    }

    // 3. Simple token numerator
    const prevChar = i > 0 ? input[i - 1] : "";
    if (!/[A-Za-z0-9]/.test(prevChar)) {
      const numMatch = input.slice(i).match(SIMPLE_TOKEN_RE);
      if (numMatch && numMatch[0].length > 0) {
        const cursor = i + numMatch[0].length;
        let tempCursor = cursor;
        while (tempCursor < len && /\s/.test(input[tempCursor])) tempCursor++;
        if (tempCursor < len && input[tempCursor] === "/") {
          tempCursor++; // skip '/'
          while (tempCursor < len && /\s/.test(input[tempCursor])) tempCursor++;
          if (tempCursor < len) {
            // Denominator delimited:
            if (input[tempCursor] === "(" || input[tempCursor] === "[") {
              const denRes = findBalancedDelimiter(input, tempCursor);
              if (denRes) {
                flushText();
                segments.push({
                  type: "fraction",
                  numerator: numMatch[0].trim(),
                  denominator: denRes.inner.trim(),
                });
                i = denRes.end;
                continue;
              }
            } else {
              // Denominator simple token:
              const denMatch = input.slice(tempCursor).match(SIMPLE_TOKEN_RE);
              if (denMatch && denMatch[0].length > 0) {
                const denEnd = tempCursor + denMatch[0].length;
                if (denEnd >= len || !/[A-Za-z0-9]/.test(input[denEnd])) {
                  // Do not treat pure multi-letter words (and/or, km/jam) as fractions
                  const numIsWord = /^[A-Za-z]{2,}$/.test(numMatch[0]);
                  const denIsWord = /^[A-Za-z]{2,}$/.test(denMatch[0]);
                  if (!(numIsWord && denIsWord)) {
                    flushText();
                    segments.push({
                      type: "fraction",
                      numerator: numMatch[0].trim(),
                      denominator: denMatch[0].trim(),
                    });
                    i = denEnd;
                    continue;
                  }
                }
              }
            }
          }
        }
      }
    }

    textBuffer += input[i];
    i++;
  }

  flushText();
  return segments;
}
