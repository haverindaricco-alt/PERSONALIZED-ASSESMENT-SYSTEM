/* ============================================================
   Pembaku jawaban isian (mirror dari canonical_answer di
   supabase/security-patch.sql). Dipakai untuk pratinjau bentuk
   baku di form admin dan simulasi di beranda. Penilaian tetap
   dilakukan di database.
   ============================================================ */

function round3(value: number): string {
  return value.toFixed(3);
}

export function canonicalAnswer(raw: string): string {
  let s = (raw ?? "").toLowerCase();
  s = s.replace(/[\t\n\r]/g, " ").replace(/\s+/g, " ").trim();
  if (s === "") return "";

  s = s
    .replace(/½/g, "1/2")
    .replace(/¼/g, "1/4")
    .replace(/¾/g, "3/4")
    .replace(/,/g, ".")
    .trim();

  s = s.replace(/\s*\/\s*/g, "/");

  if (/^-?\d+(\.\d+)?$/.test(s)) return round3(Number(s));

  if (/^[-+]?\.\d+$/.test(s)) {
    const sign = s.startsWith("-") ? "-" : "";
    const body = s.replace(/^[-+]/, "");
    return round3(Number(`${sign}0${body}`));
  }

  if (/^-?\d+\/-?\d+$/.test(s)) {
    const [numerator, denominator] = s.split("/");
    const den = Number(denominator);
    if (den === 0) return `#/${s}`;
    return round3(Number(numerator) / den);
  }

  if (/^-?\d+\s+\d+\/\d+$/.test(s)) {
    const match = /^(-?\d+)\s+(\d+)\/(\d+)$/.exec(s);
    if (!match) return s.replace(/[^a-z0-9]/g, "");
    const whole = Number(match[1]);
    const den = Number(match[3]);
    if (den === 0) return `#/${s}`;
    const value =
      whole < 0
        ? whole - Number(match[2]) / den
        : whole + Number(match[2]) / den;
    return round3(value);
  }

  return s.replace(/[^a-z0-9]/g, "");
}
