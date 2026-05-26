"use client";
import { useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";

type Tier = {
  name: string;
  monthly: number;
  yearlyMonthly: number;
  yearlyTotal: number;
  includedSessions: number;
  overage: number;
  featured?: boolean;
};

// Source of truth: src/lib/chargebee.ts (PLANS)
const TIERS: Tier[] = [
  { name: "Basic",      monthly: 150, yearlyMonthly: 120, yearlyTotal: 1440, includedSessions: 5,  overage: 35 },
  { name: "Pro",        monthly: 350, yearlyMonthly: 280, yearlyTotal: 3360, includedSessions: 15, overage: 28, featured: true },
  { name: "Enterprise", monthly: 900, yearlyMonthly: 720, yearlyTotal: 8640, includedSessions: 50, overage: 22 }
];

function fmtEUR(n: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "en" ? "en-GB" : "de-DE", { maximumFractionDigits: 0 }).format(n);
}

export default function PricingSwitcher({ locale }: { locale: Locale }) {
  const [cycle, setCycle] = useState<"yearly" | "monthly">("yearly");

  return (
    <div>
      <div className="flex items-center justify-center mb-10">
        <div className="inline-flex rounded-md border border-stone-300 bg-white p-1 shadow-sm">
          <button onClick={() => setCycle("yearly")}
            className={`px-5 py-1.5 rounded text-xs font-semibold transition-colors ${
              cycle === "yearly" ? "bg-rose-700 text-white" : "text-stone-700 hover:text-rose-700"}`}>
            {locale === "en" ? "Yearly" : "Jährlich"}
            <span className={`ml-1.5 text-[10px] font-bold ${cycle === "yearly" ? "text-rose-100" : "text-emerald-700"}`}>−20%</span>
          </button>
          <button onClick={() => setCycle("monthly")}
            className={`px-5 py-1.5 rounded text-xs font-semibold transition-colors ${
              cycle === "monthly" ? "bg-rose-700 text-white" : "text-stone-700 hover:text-rose-700"}`}>
            {locale === "en" ? "Monthly" : "Monatlich"}
          </button>
        </div>
      </div>

      <p className="text-center text-[14px] mb-8 max-w-xl mx-auto" style={{ color: "#4A4640" }}>
        {locale === "en"
          ? "Same features across all plans. The only difference is how many sessions are included per month."
          : "Alle Features in jedem Plan enthalten. Der einzige Unterschied ist die Anzahl Sessions pro Monat."}
      </p>

      <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {TIERS.map((tier) => {
          const price = cycle === "yearly" ? tier.yearlyMonthly : tier.monthly;
          const total = cycle === "yearly" ? tier.yearlyTotal : tier.monthly * 12;
          return (
            <div key={tier.name}
              className={`relative rounded-md overflow-hidden flex flex-col bg-white ${
                tier.featured ? "border-2 border-rose-700 md:-translate-y-1 shadow-md" : "border border-stone-300"}`}>
              {tier.featured && (
                <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white font-mono"
                  style={{ background: "linear-gradient(180deg, #4C1D95, #BE123C)" }}>
                  {locale === "en" ? "Popular" : "Beliebt"}
                </span>
              )}
              <div className="p-6 pb-5">
                <h3 className="font-serif text-2xl font-medium tracking-tight mb-1" style={{ color: "#1F2420" }}>Syn {tier.name}</h3>
                <p className="text-xs font-mono uppercase tracking-wider" style={{ color: "#7A7268" }}>
                  {tier.includedSessions} {locale === "en" ? "sessions / month" : "Sessions / Monat"}
                </p>
              </div>
              <div className="border-t border-stone-200 mx-6" />
              <div className="p-6 pb-4">
                <div className="flex items-baseline gap-1">
                  <span className="font-serif text-4xl font-medium" style={{ color: "#1F2420" }}>€{fmtEUR(price, locale)}</span>
                  <span className="text-sm" style={{ color: "#7A7268" }}>/{locale === "en" ? "mo" : "Mo"}</span>
                </div>
                <p className="text-xs mt-1.5" style={{ color: "#7A7268" }}>
                  {cycle === "yearly"
                    ? (locale === "en" ? `€${fmtEUR(total, locale)} billed yearly` : `€${fmtEUR(total, locale)} jährlich abgerechnet`)
                    : (locale === "en" ? "Billed monthly" : "Monatlich abgerechnet")}
                </p>
              </div>
              <div className="border-t border-stone-200 mx-6" />
              <div className="p-6 pt-5 flex-1 text-sm" style={{ color: "#4A4640" }}>
                <div className="text-[13px] leading-[1.55]">
                  {locale === "en" ? (
                    <>
                      <span className="font-semibold" style={{ color: "#1F2420" }}>{tier.includedSessions}</span> sessions included per month.
                      <br />
                      Need more? <span className="font-semibold" style={{ color: "#1F2420" }}>€{tier.overage}</span> per extra session.
                    </>
                  ) : (
                    <>
                      <span className="font-semibold" style={{ color: "#1F2420" }}>{tier.includedSessions}</span> Sessions pro Monat enthalten.
                      <br />
                      Mehr nötig? <span className="font-semibold" style={{ color: "#1F2420" }}>€{tier.overage}</span> pro zusätzliche Session.
                    </>
                  )}
                </div>
              </div>
              <div className="p-6 pt-2">
                <Link href="/register"
                  className={`block w-full text-center py-2.5 rounded-md text-sm font-medium transition-colors ${
                    tier.featured
                      ? "btn-primary text-white"
                      : "border border-stone-400 bg-white text-stone-900 hover:bg-stone-50"}`}>
                  {locale === "en" ? `Choose ${tier.name}` : `${tier.name} wählen`}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
