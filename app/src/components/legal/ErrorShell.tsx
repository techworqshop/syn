import Link from "next/link";
import type { ReactNode } from "react";

// Simpler Shell fuer 404 + andere statische Error-Pages. Eigene Komponente
// (statt LegalShell), weil der Inhalt zentriert + im Code-Hero-Stil ist.
export default function ErrorShell({ children }: { children: ReactNode }) {
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
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src="/api/assets/syn-avatar"
            alt="Syn"
            className="w-7 h-7 rounded-full ring-1 ring-white/40 object-cover"
          />
          <span className="font-semibold text-lg tracking-tight" style={{ color: "#BE123C" }}>Syn</span>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div
          className="w-full max-w-[480px] relative overflow-hidden text-center"
          style={{
            background: "#F3EFE2",
            border: "1px solid rgba(31,36,32,0.06)",
            borderRadius: "20px"
          }}
        >
          <span
            aria-hidden
            className="absolute top-0 left-0 right-0"
            style={{ height: "4px", background: "linear-gradient(90deg, #4C1D95 0%, #9F1239 55%, #BE123C 100%)" }}
          />
          <div className="px-10 pt-14 pb-10">
            {children}
          </div>
        </div>
      </div>

      <footer className="px-8 py-6 flex justify-center gap-6 text-xs flex-wrap" style={{ color: "#7A7268" }}>
        <Link href="/impressum" className="hover:text-stone-900 transition-colors">Impressum</Link>
        <Link href="/datenschutz" className="hover:text-stone-900 transition-colors">Datenschutz</Link>
        <Link href="/agb" className="hover:text-stone-900 transition-colors">AGB</Link>
      </footer>

      <style>{`
        .code {
          font-size: 96px;
          font-weight: 600;
          letter-spacing: -0.04em;
          line-height: 1;
          margin-bottom: 1rem;
          background: linear-gradient(180deg, #4C1D95 0%, #9F1239 55%, #BE123C 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          display: inline-block;
        }
      `}</style>
    </main>
  );
}
