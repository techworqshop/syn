"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// "Analytics" ist die Default-Landing (/app/admin -> /app/admin/analytics).
// Daher in den Tabs nicht mehr noetig — Admin-Hauptmenue IST Analytics.
const TABS: Array<{ href: string; label: string }> = [
  { href: "/app/admin/users",     label: "Users" },
  { href: "/app/admin/sessions",  label: "Sessions" },
  { href: "/app/admin/errors",    label: "Errors" },
  { href: "/app/admin/invites",   label: "Invites" }
];

export default function AdminNav() {
  const path = usePathname();
  return (
    <div className="relative z-20 px-6 py-2 flex items-center gap-1 overflow-x-auto" style={{ background: "#F3EFE2", borderBottom: "1px solid rgba(31,36,32,0.08)" }}>
      <Link href="/app/admin/analytics"
        className={"text-xs uppercase tracking-wider font-bold mr-4 transition-colors " + (path === "/app/admin/analytics" ? "text-stone-900" : "text-stone-500 hover:text-stone-700")}>
        Admin
      </Link>
      {TABS.map(t => {
        const active = path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              active
                ? "text-white shadow-sm"
                : "text-stone-700 hover:bg-stone-200/60"
            }`}
            style={active ? { background: "linear-gradient(180deg, #4C1D95, #BE123C)" } : undefined}>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
