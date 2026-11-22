import { parseMathText } from "../lib/mathText";

/** Menampilkan jawaban dengan pecahan bertumpuk (pembilang di atas,
    penyebut di bawah). Teks yang dinilai tetap versi aslinya. */
export function MathText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  return (
    <span className={"whitespace-pre-wrap break-words " + className}>
      {parseMathText(text).map((segment, index) =>
        segment.type === "text" ? (
          <span key={index}>{segment.value}</span>
        ) : (
          <span
            key={index}
            className="mx-1 inline-flex flex-col items-center self-center align-middle leading-none"
          >
            <span className="max-w-full px-1 text-center">
              {segment.numerator}
            </span>
            <span className="my-1 h-px w-full min-w-8 self-stretch bg-current" />
            <span className="max-w-full px-1 text-center">
              {segment.denominator}
            </span>
          </span>
        ),
      )}
    </span>
  );
}
