import type React from "react";

function renderInline(line: string, keyPrefix: string) {
  const parts: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) parts.push(line.slice(last, m.index));
    parts.push(<strong key={`${keyPrefix}-b${i++}`} className="font-semibold text-stone-900">{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return parts.length ? parts : line;
}

export function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split(/\r?\n/);
  const out: React.ReactNode[] = [];
  let bulletBuf: string[] = [];
  const flushBullets = () => {
    if (!bulletBuf.length) return;
    const items = bulletBuf;
    bulletBuf = [];
    out.push(
      <ul key={`ul-${out.length}`} className="list-disc pl-5 space-y-0.5 my-1">
        {items.map((it, k) => <li key={k}>{renderInline(it, `li${out.length}-${k}`)}</li>)}
      </ul>
    );
  };
  lines.forEach((raw, idx) => {
    const line = raw;
    // Inline --- werden geschluckt; Section-Headings (## N.) bringen ihren eigenen Trenner via border-top
    if (/^\s*---+\s*$/.test(line)) {
      flushBullets();
      return;
    }
    const h = line.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      flushBullets();
      const level = h[1].length;
      const isNumberedSection = level === 2 && /^\s*\d+\.\s/.test(h[2]);
      const cls = level === 1 ? "text-[16px] font-bold text-stone-900 mt-1"
        : level === 2 ? (isNumberedSection
            ? "text-[15px] font-bold text-stone-900 mt-4 pt-3 border-t-2 border-stone-300 uppercase tracking-wide"
            : "text-[15px] font-semibold text-stone-900 mt-3")
        : "text-[14px] font-semibold text-stone-800 mt-2";
      out.push(<div key={`h-${idx}`} className={cls}>{renderInline(h[2], `h${idx}`)}</div>);
      return;
    }
    const b = line.match(/^\s*[-*]\s+(.+)$/);
    if (b) { bulletBuf.push(b[1]); return; }
    flushBullets();
    if (line.trim() === "") { out.push(<div key={`br-${idx}`} className="h-2" />); return; }
    out.push(<div key={`p-${idx}`}>{renderInline(line, `p${idx}`)}</div>);
  });
  flushBullets();
  return out;
}
