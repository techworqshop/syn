"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  paramName?: string;          // default: "q"
  placeholder?: string;
  hint?: string;
  initial?: string;
};

export default function AdminFilterBar({ paramName = "q", placeholder = "Filter (Email, Name, Titel)...", hint, initial }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const urlValue = params.get(paramName) ?? "";
  const [value, setValue] = useState(initial ?? urlValue);

  // Hold die URL in sync wenn andere Params sich aendern
  useEffect(() => { setValue(urlValue); /* eslint-disable-line */ }, [urlValue]);

  function commit(next: string) {
    const sp = new URLSearchParams(params.toString());
    if (next.trim()) sp.set(paramName, next.trim());
    else sp.delete(paramName);
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function clear() {
    setValue("");
    commit("");
  }

  return (
    <div className="rounded-md bg-[#F3EFE2] border border-stone-300 px-3 py-2 shadow-sm flex items-center gap-2">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-stone-500 shrink-0">
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") { e.preventDefault(); commit(value); }
          if (e.key === "Escape") clear();
        }}
        onBlur={() => { if (value !== urlValue) commit(value); }}
        placeholder={placeholder}
        type="text"
        className="flex-1 bg-transparent text-sm text-stone-900 placeholder:text-stone-500 focus:outline-none min-w-0"
      />
      {value && (
        <button onClick={clear} title="Filter zuruecksetzen"
          className="text-xs text-stone-600 hover:text-stone-900 font-medium px-2 py-0.5 rounded hover:bg-stone-200 transition-colors shrink-0">
          ×
        </button>
      )}
      {hint && <span className="hidden sm:inline text-xs text-stone-500 shrink-0">{hint}</span>}
    </div>
  );
}
