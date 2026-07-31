"use client";

declare global {
  interface Window {
    et_showOptIn?: () => void;
  }
}

/**
 * Oeffnet den etracker Consent-Dialog erneut (Widerruf/Aenderung der Einwilligung,
 * Art. 7 Abs. 3 DSGVO). Ersetzt den schwebenden etracker-Button.
 *
 * Bewusst ein Button mit onClick statt href="javascript:et_showOptIn()":
 * React blockiert javascript:-URLs, und sie kollidieren mit unserer CSP.
 */
export default function ConsentLink({
  label,
  className
}: {
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.et_showOptIn?.()}
      className={className ?? "hover:text-rose-700 transition-colors text-left"}
    >
      {label}
    </button>
  );
}
