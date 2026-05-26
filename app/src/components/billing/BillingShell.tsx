import Link from "next/link";
import type { ReactNode } from "react";
import { auth } from "@/lib/auth";

// Shared Shell fuer /billing/* Pages — minimale Nav (Logo + User-Email),
// cream-boho-Hintergrund, optionaler Card-Container.
//
// NOCH NICHT VERLINKT — die Pages existieren als Placeholder fuer
// Stripe-Integration. UI ist Mockup-genau, Daten sind hardcoded.

type Props = {
  children: ReactNode;
  /** Wenn true: zentriert die children in einer max-w-[480px] Card mit Brand-Stripe (fuer Cancel/Cancelled). Wenn false: gibt freien Content-Bereich (fuer Billing-Dashboard mit mehreren Sections). */
  centered?: boolean;
  /** Top-stripe Farbe — default Brand-Gradient, "danger" fuer Bordeaux (Cancel-Page). */
  stripeVariant?: "brand" | "danger";
  cardMaxWidth?: string;
};

export default async function BillingShell({ children, centered = true, stripeVariant = "brand", cardMaxWidth = "480px" }: Props) {
  const session = await auth();
  const email = session?.user?.email ?? "";
  const stripe = stripeVariant === "danger"
    ? "linear-gradient(90deg, #913B4F, #4F1A28)"
    : "linear-gradient(90deg, #4C1D95 0%, #9F1239 55%, #BE123C 100%)";

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{
        background: "#F4F1EA",
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
        <Link href="/app/dashboard" className="flex items-center gap-2.5">
          <img src="/api/assets/syn-avatar" alt="Syn" className="w-7 h-7 rounded-full ring-1 ring-white/40 object-cover" />
          <span className="font-serif text-xl font-medium tracking-tight" style={{ color: "#1F2420" }}>Syn</span>
        </Link>
        <span className="text-sm" style={{ color: "#4A4640" }}>{email}</span>
      </nav>

      {centered ? (
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
            <span aria-hidden className="absolute top-0 left-0 right-0" style={{ height: "4px", background: stripe }} />
            <div className="px-10 pt-12 pb-10">{children}</div>
          </div>
        </div>
      ) : (
        <div className="flex-1 w-full max-w-[760px] mx-auto px-6 py-10">{children}</div>
      )}

      <footer className="px-8 py-6 flex justify-center gap-6 text-xs" style={{ color: "#7A7268" }}>
        <Link href="/impressum" className="hover:text-stone-900 transition-colors">Impressum</Link>
        <Link href="/datenschutz" className="hover:text-stone-900 transition-colors">Datenschutz</Link>
        <Link href="/agb" className="hover:text-stone-900 transition-colors">AGB</Link>
      </footer>
    </main>
  );
}
