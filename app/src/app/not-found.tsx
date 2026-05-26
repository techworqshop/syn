import Link from "next/link";
import ErrorShell from "@/components/legal/ErrorShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Syn — Seite nicht gefunden" };

export default function NotFound() {
  return (
    <ErrorShell>
      <div className="code">404</div>
      <h1 className="text-2xl font-semibold tracking-tight mt-2 mb-2" style={{ color: "#1F2420" }}>
        Diese Seite gibt es nicht.
      </h1>
      <p className="text-[15px] leading-relaxed mb-8 max-w-sm mx-auto" style={{ color: "#4A4640" }}>
        Vielleicht falsche URL, vielleicht ein veralteter Link. Beides zu reparieren.
      </p>
      <div className="flex flex-col items-center gap-2">
        <Link
          href="/"
          className="inline-block px-7 py-3 rounded-md text-sm font-medium text-white"
          style={{ background: "linear-gradient(180deg, #4C1D95 0%, #9F1239 55%, #BE123C 100%)" }}
        >
          Zurück zur Startseite
        </Link>
        <Link href="/login" className="text-[13px] mt-1 hover:underline" style={{ color: "#4A4640" }}>
          Oder direkt zum Login
        </Link>
      </div>
    </ErrorShell>
  );
}
