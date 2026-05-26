import Link from "next/link";
import type { ReactNode } from "react";
import { getLocaleFromCookies } from "@/lib/i18n";
import LanguageSwitch from "@/components/LanguageSwitch";

// Shared shell for /impressum, /datenschutz, /agb.
// Matches the editorial landing-page brand: cream background, Fraunces
// headlines, Inter body, JetBrains Mono for meta labels, thin 0.5px
// borders, 6px corner radius.

type Props = {
  children: ReactNode;
  title: string;
  meta?: ReactNode;
};

export default async function LegalShell({ children, title, meta }: Props) {
  const locale = await getLocaleFromCookies();
  return (
    <main className="min-h-screen flex flex-col" style={{ background: "#F4F1EA", color: "#1F2420" }}>
      <nav
        className="border-b sticky top-0 z-30 backdrop-blur-md"
        style={{ borderColor: "rgba(26,24,21,0.12)", background: "rgba(244,241,234,0.85)" }}
      >
        <div className="max-w-6xl mx-auto px-6 lg:px-12 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Zur Startseite">
            <img
              src="/api/assets/syn-avatar"
              alt="Syn"
              className="w-7 h-7 rounded-full ring-1 ring-white/40 object-cover"
            />
            <span className="font-serif text-xl font-medium tracking-tight" style={{ color: "#1F2420" }}>Syn</span>
          </Link>
          <LanguageSwitch locale={locale} />
        </div>
      </nav>

      <div className="flex-1 w-full max-w-3xl mx-auto px-6 lg:px-12 py-16">
        <article
          className="relative overflow-hidden p-8 md:p-12 rounded-md bg-white"
          style={{ border: "1px solid rgba(26,24,21,0.12)", boxShadow: "0 4px 24px -12px rgba(26,24,21,0.08)" }}
        >
          <div className="font-mono text-[11px] uppercase tracking-[0.15em] mb-4 flex items-center gap-3" style={{ color: "#8A857C" }}>
            <span className="w-6 h-px" style={{ background: "#8A857C" }} />
            {locale === "en" ? "Legal" : "Recht"}
          </div>
          <h1 className="font-serif font-normal text-4xl lg:text-5xl tracking-tight leading-[1.05] mb-3" style={{ color: "#1F2420" }}>{title}</h1>
          {meta && <p className="text-[13px] mb-10" style={{ color: "#8A857C" }}>{meta}</p>}
          <div className="legal-content">{children}</div>
        </article>
      </div>

      <footer className="border-t py-10" style={{ borderColor: "rgba(26,24,21,0.12)" }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-12 flex flex-col sm:flex-row justify-between gap-4 items-center">
          <div className="flex gap-6 text-xs" style={{ color: "#4A4640" }}>
            <Link href="/impressum" className="hover:text-rose-700 transition-colors">{locale === "en" ? "Imprint" : "Impressum"}</Link>
            <Link href="/datenschutz" className="hover:text-rose-700 transition-colors">{locale === "en" ? "Privacy" : "Datenschutz"}</Link>
            <Link href="/agb" className="hover:text-rose-700 transition-colors">{locale === "en" ? "Terms" : "AGB"}</Link>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[0.05em]" style={{ color: "#8A857C" }}>
            © 2026 Syn · {locale === "en" ? "A Worqshop product" : "Ein Produkt von Worqshop"}
          </span>
        </div>
      </footer>
    </main>
  );
}

// Shared typography components for legal pages — Fraunces for headings,
// Inter body, dense leading, plenty of breathing room.
export function LH2({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-serif text-[22px] font-medium tracking-tight mt-10 mb-3" style={{ color: "#1F2420" }}>
      {children}
    </h2>
  );
}
export function LH3({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-serif text-[17px] font-medium tracking-tight mt-6 mb-2" style={{ color: "#1F2420" }}>
      {children}
    </h3>
  );
}
export function LP({ children }: { children: ReactNode }) {
  return <p className="text-[15px] leading-[1.65] mb-3" style={{ color: "#4A4640" }}>{children}</p>;
}
export function LStrong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold" style={{ color: "#1F2420" }}>{children}</strong>;
}
export function LA({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="text-rose-700 hover:text-rose-800 underline decoration-rose-700/30 hover:decoration-rose-800/60 transition-colors">
      {children}
    </a>
  );
}

export function LUl({ children }: { children: ReactNode }) {
  return <ul className="list-disc pl-6 text-[15px] leading-[1.65] mb-3 space-y-1" style={{ color: "#4A4640" }}>{children}</ul>;
}
export function LLi({ children }: { children: ReactNode }) {
  return <li>{children}</li>;
}
export function LNotice({ children }: { children: ReactNode }) {
  return (
    <div className="my-6 p-4 rounded-md text-[14px] leading-[1.6]"
      style={{ background: "rgba(190,18,60,0.06)", border: "1px solid rgba(190,18,60,0.18)", color: "#4A4640" }}>
      {children}
    </div>
  );
}
