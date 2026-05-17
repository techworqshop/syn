import Link from "next/link";
import type { ReactNode } from "react";
import { getLocaleFromCookies } from "@/lib/i18n";
import LanguageSwitch from "@/components/LanguageSwitch";

// Shared Shell fuer /impressum, /datenschutz, /agb.
// Minimale Navigation (Logo + LanguageSwitch), Brand-Stripe-Card,
// Footer mit Cross-Links. Cream-Boho-Hintergrund passend zur Landing.
type Props = {
  children: ReactNode;
  title: string;
  meta?: ReactNode;
};

export default async function LegalShell({ children, title, meta }: Props) {
  const locale = await getLocaleFromCookies();
  return (
    <main
      className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(ellipse 900px 700px at 12% 8%, rgba(101,134,70,0.10), transparent 60%)," +
          "radial-gradient(ellipse 1000px 800px at 88% 32%, rgba(214,165,88,0.09), transparent 60%)," +
          "radial-gradient(ellipse 800px 600px at 50% 95%, rgba(143,122,80,0.10), transparent 60%)," +
          "#E8E2D2",
        color: "#1F2420",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
      }}
    >
      <nav
        className="flex items-center justify-between px-7 py-3.5"
        style={{
          background: "rgba(243,239,226,0.55)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.5)"
        }}
      >
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="Zur Startseite">
          <img
            src="/api/assets/syn-avatar"
            alt="Syn"
            className="w-7 h-7 rounded-full ring-1 ring-white/40 object-cover group-hover:ring-white/60 transition"
          />
          <span className="font-semibold text-lg tracking-tight" style={{ color: "#BE123C" }}>Syn</span>
        </Link>
        <LanguageSwitch locale={locale} />
      </nav>

      <div className="flex-1 w-full max-w-[760px] mx-auto px-6 py-12">
        <article
          className="relative overflow-hidden p-8 md:p-12"
          style={{ background: "#F3EFE2", borderRadius: "20px", border: "1px solid rgba(31,36,32,0.06)" }}
        >
          <span
            aria-hidden
            className="absolute top-0 left-0 right-0"
            style={{ height: "4px", background: "linear-gradient(90deg, #4C1D95 0%, #9F1239 55%, #BE123C 100%)" }}
          />
          <h1 className="text-[32px] font-semibold tracking-tight mb-2" style={{ color: "#1F2420" }}>{title}</h1>
          {meta && <p className="text-[13px] mb-10" style={{ color: "#7A7268" }}>{meta}</p>}
          <div className="legal-content">{children}</div>
        </article>
      </div>

      <footer className="px-8 py-8 flex justify-center gap-6 text-xs flex-wrap" style={{ color: "#7A7268" }}>
        <Link href="/impressum" className="hover:text-stone-900 transition-colors">Impressum</Link>
        <Link href="/datenschutz" className="hover:text-stone-900 transition-colors">Datenschutz</Link>
        <Link href="/agb" className="hover:text-stone-900 transition-colors">AGB</Link>
      </footer>
    </main>
  );
}

// Shared typography components — gleiche Styles in allen Legal-Pages.
export function LH2({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-semibold tracking-tight mt-8 mb-3" style={{ color: "#1F2420" }}>{children}</h2>;
}
export function LH3({ children }: { children: ReactNode }) {
  return <h3 className="text-[15px] font-semibold mt-5 mb-2" style={{ color: "#1F2420" }}>{children}</h3>;
}
export function LP({ children }: { children: ReactNode }) {
  return <p className="text-[15px] leading-[1.7] mb-3" style={{ color: "#4A4640" }}>{children}</p>;
}
export function LStrong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold" style={{ color: "#1F2420" }}>{children}</strong>;
}
export function LA({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} className="hover:underline" style={{ color: "#BE123C" }}>{children}</a>;
}
export function LUl({ children }: { children: ReactNode }) {
  return <ul className="pl-6 mb-3 list-disc">{children}</ul>;
}
export function LLi({ children }: { children: ReactNode }) {
  return <li className="text-[15px] leading-[1.7] mb-1" style={{ color: "#4A4640" }}>{children}</li>;
}
export function LNotice({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-lg px-5 py-4 my-6"
      style={{ background: "#fdfbf4", border: "1px solid rgba(31,36,32,0.10)", borderLeft: "3px solid #BE123C" }}
    >
      <p className="text-sm leading-relaxed m-0" style={{ color: "#4A4640" }}>{children}</p>
    </div>
  );
}
export function LWarning({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-lg px-5 py-4 my-6"
      style={{ background: "#FCE7E7", border: "1px solid #C53E0F", borderLeft: "3px solid #BE123C" }}
    >
      <p className="text-sm leading-relaxed m-0" style={{ color: "#7F1D1D" }}>{children}</p>
    </div>
  );
}
