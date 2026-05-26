import Link from "next/link";
import type { ReactNode } from "react";
import { getLocaleFromCookies, type Locale } from "@/lib/i18n";
import LanguageSwitch from "@/components/LanguageSwitch";

// Shared shell fuer Login/Signup/Recovery — Mockup-genau:
// cream Hintergrund + 3 radial gradients, sticky Nav mit Logo,
// LanguageSwitch + frei waehlbarer Top-Right-Slot, Card mit
// 4px Brand-Stripe oben, schlanker Footer.
type Props = {
  children: ReactNode;
  navRight?: ReactNode;
  locale?: Locale;
  footer?: ReactNode;
  cardMaxWidth?: string;
};

export default async function AuthShell({ children, navRight, locale: providedLocale, footer, cardMaxWidth = "440px" }: Props) {
  const locale = providedLocale ?? (await getLocaleFromCookies());
  return (
    <main
      className="min-h-screen flex flex-col"
      style={{
        background: "#F4F1EA",
        color: "#1F2420",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
      }}
    >
      {/* Nav: Logo links (klickbar zur Landing), Lang + Slot rechts */}
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
          <span className="font-serif text-xl font-medium tracking-tight" style={{ color: "#1F2420" }}>Syn</span>
        </Link>
        <div className="flex items-center gap-4">
          <LanguageSwitch locale={locale} />
          {navRight}
        </div>
      </nav>

      {/* Main: zentriertes Card-Frame */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div
          className="w-full relative overflow-hidden"
          style={{
            maxWidth: cardMaxWidth,
            background: "#F3EFE2",
            border: "1px solid rgba(31,36,32,0.06)",
            borderRadius: "6px"
          }}
        >
          {/* Brand-Stripe oben */}
          <span
            aria-hidden
            className="absolute top-0 left-0 right-0"
            style={{ height: "4px", background: "linear-gradient(90deg, #4C1D95 0%, #9F1239 55%, #BE123C 100%)" }}
          />
          <div className="px-8 pt-10 pb-8">{children}</div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-8 py-6 flex justify-center gap-6 text-xs" style={{ color: "#7A7268" }}>
        {footer ?? (
          <>
            <Link href="/impressum" className="hover:text-stone-900 transition-colors">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-stone-900 transition-colors">Datenschutz</Link>
            <Link href="/agb" className="hover:text-stone-900 transition-colors">AGB</Link>
          </>
        )}
      </footer>
    </main>
  );
}

// Re-usable styles — von allen Auth-Pages identisch nutzbar.
export const authStyles = {
  title: "text-[26px] font-semibold tracking-tight mb-1.5",
  titleColor: { color: "#1F2420" },
  sub: "text-sm mb-7",
  subColor: { color: "#7A7268" },
  label: "block text-xs font-semibold mb-1.5 tracking-wide",
  labelColor: { color: "#4A4640" },
  input:
    "w-full px-3.5 py-3 rounded-md text-sm outline-none transition-colors",
  inputStyle: {
    background: "#fdfbf4",
    border: "1px solid rgba(31,36,32,0.15)",
    color: "#1F2420"
  },
  cta:
    "w-full text-white border-none rounded-md py-3.5 px-4 text-sm font-medium transition-all",
  ctaStyle: {
    background: "linear-gradient(180deg, #4C1D95 0%, #9F1239 55%, #BE123C 100%)"
  },
  hint: "text-[11.5px] mt-1.5",
  hintColor: { color: "#7A7268" },
  bottomLink: "text-center text-sm mt-5",
  bottomLinkColor: { color: "#7A7268" },
  forgotLink: "text-xs font-medium hover:underline",
  forgotLinkColor: { color: "#BE123C" }
};
