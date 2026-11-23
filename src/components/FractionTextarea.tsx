import { useRef, useState } from "react";
import { Divide } from "lucide-react";
import { MathText } from "./MathText";
import { textareaClass } from "./ui";
import {
  normalizeMathText,
  normalizePastedMath,
  stripOuterDelimiters,
} from "../lib/mathText";

/** Kolom teks panjang dengan alat bantu pecahan yang sama seperti
    halaman ujian siswa. Nilai tetap disimpan sebagai teks `a/b` atau
    `(a)/(b)` agar bisa dinilai oleh canonical_answer. */
export function FractionTextarea({
  id,
  value,
  onChange,
  placeholder,
  rows = 5,
  minHeightClass = "min-h-24",
  label,
  showPreview = false,
  previewLabel = "Tampilan",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  minHeightClass?: string;
  label?: string;
  showPreview?: boolean;
  previewLabel?: string;
}) {
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const selectionRef = useRef({ start: 0, end: 0 });

  const [open, setOpen] = useState(false);
  const [num, setNum] = useState("");
  const [den, setDen] = useState("");

  const numValue = num.trim();
  const denValue = den.trim();
  const cleanNum = stripOuterDelimiters(numValue);
  const cleanDen = stripOuterDelimiters(denValue);
  const denominatorIsZero = /^[+-]?0+(?:[.,]0+)?$/.test(cleanDen);
  const valid = cleanNum.length > 0 && cleanDen.length > 0 && !denominatorIsZero;

  const tokenPreview = valid
    ? (() => {
        const atomicNum =
          /^[A-Za-z0-9]+$/.test(cleanNum) || /^[+-]?\d+$/.test(cleanNum);
        const atomicDen =
          /^[A-Za-z0-9]+$/.test(cleanDen) || /^[+-]?\d+$/.test(cleanDen);
        return atomicNum && atomicDen
          ? `${cleanNum}/${cleanDen}`
          : `(${cleanNum})/(${cleanDen})`;
      })()
    : "";

  function rememberSelection() {
    const el = areaRef.current;
    if (!el) return;
    selectionRef.current = { start: el.selectionStart, end: el.selectionEnd };
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const text = e.clipboardData.getData("text");
    if (!text) return;
    const normalized = normalizePastedMath(text);
    if (normalized !== text) {
      e.preventDefault();
      const el = areaRef.current;
      if (!el) {
        onChange(value + normalized);
        return;
      }
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const nextValue = value.slice(0, start) + normalized + value.slice(end);
      onChange(nextValue);
      requestAnimationFrame(() => {
        const newPos = start + normalized.length;
        el.focus();
        el.setSelectionRange(newPos, newPos);
        selectionRef.current = { start: newPos, end: newPos };
      });
    }
  }

  function insertFraction() {
    if (!valid) return;

    /* Token tunggal (5, y2, -1) tidak perlu tanda kurung agar pecahan
       angka tetap dikenali sebagai nilai oleh canonical_answer. Ekspresi
       seperti y2 - y1 atau 3 - (-2) dibungkus rapi agar batas pembilang/penyebut jelas. */
    const atomicNum =
      /^[A-Za-z0-9]+$/.test(cleanNum) || /^[+-]?\d+$/.test(cleanNum);
    const atomicDen =
      /^[A-Za-z0-9]+$/.test(cleanDen) || /^[+-]?\d+$/.test(cleanDen);
    const token =
      atomicNum && atomicDen
        ? `${cleanNum}/${cleanDen}`
        : `(${cleanNum})/(${cleanDen})`;

    const { start, end } = selectionRef.current;
    onChange(value.slice(0, start) + token + value.slice(end));
    setOpen(false);
    setNum("");
    setDen("");
    requestAnimationFrame(() => {
      const el = areaRef.current;
      if (!el) return;
      const pos = start + token.length;
      el.focus();
      el.setSelectionRange(pos, pos);
      selectionRef.current = { start: pos, end: pos };
    });
  }

  function insertOnEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      insertFraction();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {label ? (
          <label
            htmlFor={id}
            className="text-caption-strong text-ink-80"
          >
            {label}
          </label>
        ) : (
          <span />
        )}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="press focus-ring inline-flex items-center gap-1.5 rounded-pill border border-hairline bg-canvas px-3 py-1.5 text-caption-strong text-primary hover:bg-pearl"
        >
          <Divide className="size-4" />
          Pecahan
        </button>
      </div>

      <textarea
        id={id}
        ref={areaRef}
        rows={rows}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(normalizeMathText(e.target.value))}
        onPaste={handlePaste}
        onFocus={rememberSelection}
        onSelect={rememberSelection}
        onKeyUp={rememberSelection}
        onClick={rememberSelection}
        placeholder={placeholder}
        className={textareaClass + " " + minHeightClass + " resize-y"}
      />

      {showPreview && value.trim() && (
        <div className="rounded-util border border-hairline bg-pearl p-4">
          <p className="text-caption-strong text-ink">{previewLabel}</p>
          <div className="mt-3 rounded-util border border-hairline bg-canvas px-4 py-3 text-body text-ink">
            <MathText text={value} />
          </div>
        </div>
      )}

      {open && (
        <div className="rounded-util border border-hairline bg-pearl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-caption-strong text-ink">Sisipkan pecahan</p>
              <p className="text-caption mt-1 text-ink-48">
                Boleh angka, huruf, operasi hitung, atau kurung bersarang seperti 3 - (-2).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="press focus-ring rounded-pill px-2 py-1 text-caption text-ink-48 hover:text-ink"
            >
              Tutup
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-caption text-ink-48">
              Pembilang
              <input
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={num}
                placeholder="Misal: -8 - 7 atau y2 - y1"
                onChange={(e) => setNum(normalizeMathText(e.target.value))}
                onKeyDown={insertOnEnter}
                className="focus-ring h-10 w-48 rounded-util border border-hairline bg-canvas px-3 text-body text-ink placeholder:text-ink-48"
              />
            </label>

            <span className="pb-2 text-body text-ink-48">/</span>

            <label className="flex flex-col gap-1 text-caption text-ink-48">
              Penyebut
              <input
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={den}
                placeholder="Misal: 3 - (-2) atau [3-(-2)]"
                onChange={(e) => setDen(normalizeMathText(e.target.value))}
                onKeyDown={insertOnEnter}
                className="focus-ring h-10 w-48 rounded-util border border-hairline bg-canvas px-3 text-body text-ink placeholder:text-ink-48"
              />
            </label>

            <button
              type="button"
              disabled={!valid}
              onClick={insertFraction}
              className="press focus-ring h-10 rounded-pill bg-ink px-4 text-caption-strong text-white hover:bg-ink-80 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sisipkan
            </button>
          </div>

          {tokenPreview && (
            <div className="mt-3 flex items-center gap-3 rounded-util border border-hairline bg-canvas p-3">
              <span className="text-caption text-ink-48">Pratinjau pecahan:</span>
              <div className="text-body text-ink font-medium">
                <MathText text={tokenPreview} />
              </div>
            </div>
          )}

          {(numValue || denValue) && !valid && (
            <p className="text-caption mt-2 text-bad">
              Pembilang dan penyebut wajib diisi, dan penyebut tidak boleh 0.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
