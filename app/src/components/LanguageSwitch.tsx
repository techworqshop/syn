"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";

export default function LanguageSwitch({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Locale | null>(null);
  async function set(next: Locale) {
    if (locale === next || busy) return;
    setBusy(next);
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next })
    }).catch(() => {});
    router.refresh();
    setTimeout(() => setBusy(null), 200);
  }
  return (
    <div className="inline-flex items-center text-xs font-bold select-none" title="Sprache / Language">
      <button onClick={() => set("de")}
        className={`px-1.5 py-0.5 rounded transition-colors ${locale === "de" ? "text-rose-700" : "text-stone-500 hover:text-stone-800"}`}
        aria-pressed={locale === "de"}>
        DE
      </button>
      <span className="text-stone-400">·</span>
      <button onClick={() => set("en")}
        className={`px-1.5 py-0.5 rounded transition-colors ${locale === "en" ? "text-rose-700" : "text-stone-500 hover:text-stone-800"}`}
        aria-pressed={locale === "en"}>
        EN
      </button>
    </div>
  );
}
