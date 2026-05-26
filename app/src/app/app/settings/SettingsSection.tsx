import type { ReactNode } from "react";

// Re-usable Settings-Card mit Brand-Stripe oben.
export default function SettingsSection({ title, children, stripeVariant = "brand" }: { title: string; children: ReactNode; stripeVariant?: "brand" | "danger" }) {
  const stripe = stripeVariant === "danger"
    ? "linear-gradient(90deg, #913B4F, #4F1A28)"
    : "linear-gradient(90deg, #4C1D95 0%, #9F1239 55%, #BE123C 100%)";
  return (
    <div className="relative overflow-hidden mb-5 rounded-md" style={{ background: "#F3EFE2", border: "1px solid rgba(31,36,32,0.06)" }}>
      <span aria-hidden className="absolute top-0 left-0 right-0" style={{ height: "4px", background: stripe }} />
      <div className="px-7 pt-7 pb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-5" style={{ color: "#7A7268", letterSpacing: "0.08em" }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
