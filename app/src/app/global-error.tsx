"use client";

// Globaler Error-Handler — Next.js ruft das auf wenn auf einer Server-
// oder Client-Component eine Exception hochbubbelt. Eigenes <html>/<body>
// noetig weil das Root-Layout im Error-Pfad nicht greift.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body
        style={{
          background:
            "radial-gradient(ellipse 900px 700px at 12% 8%, rgba(101,134,70,0.10), transparent 60%)," +
            "radial-gradient(ellipse 1000px 800px at 88% 32%, rgba(214,165,88,0.09), transparent 60%)," +
            "radial-gradient(ellipse 800px 600px at 50% 95%, rgba(143,122,80,0.10), transparent 60%)," +
            "#E8E2D2",
          color: "#1F2420",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          margin: 0,
          padding: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 28px",
            background: "rgba(243,239,226,0.55)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255,255,255,0.5)"
          }}
        >
          <a href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <img
              src="/api/assets/syn-avatar"
              alt="Syn"
              style={{ width: "28px", height: "28px", borderRadius: "50%" }}
            />
            <span style={{ fontWeight: 600, fontSize: "18px", color: "#BE123C", letterSpacing: "-0.01em" }}>Syn</span>
          </a>
        </nav>

        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem 1.5rem" }}>
          <div
            style={{
              background: "#F3EFE2",
              borderRadius: "20px",
              maxWidth: "480px",
              width: "100%",
              position: "relative",
              overflow: "hidden",
              border: "1px solid rgba(31,36,32,0.06)",
              textAlign: "center"
            }}
          >
            <span
              aria-hidden
              style={{
                position: "absolute",
                top: 0, left: 0, right: 0, height: "4px",
                background: "linear-gradient(90deg, #4C1D95 0%, #9F1239 55%, #BE123C 100%)"
              }}
            />
            <div style={{ padding: "3.5rem 2.5rem 2.5rem" }}>
              <div
                style={{
                  fontSize: "96px",
                  fontWeight: 600,
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                  marginBottom: "1.5rem",
                  background: "linear-gradient(180deg, #4C1D95 0%, #9F1239 55%, #BE123C 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  display: "inline-block"
                }}
              >
                500
              </div>
              <h1 style={{ fontSize: "24px", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: "0.6rem", color: "#1F2420" }}>
                Etwas ist schiefgelaufen.
              </h1>
              <p style={{ fontSize: "15px", color: "#4A4640", marginBottom: "2rem", lineHeight: 1.55 }}>
                Auf unserer Seite, nicht auf deiner. Wir wurden automatisch benachrichtigt — versuch&apos;s gleich nochmal.
              </p>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
                <button
                  onClick={() => reset()}
                  style={{
                    background: "linear-gradient(180deg, #4C1D95, #9F1239, #BE123C)",
                    color: "#fff",
                    border: "none",
                    padding: "13px 28px",
                    borderRadius: "11px",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "inherit"
                  }}
                >
                  Erneut versuchen
                </button>
                <a
                  href="/"
                  style={{ fontSize: "13px", color: "#4A4640", textDecoration: "none", marginTop: "0.25rem" }}
                >
                  Oder zur Startseite
                </a>
              </div>
              {error?.digest && (
                <p style={{ fontSize: "11px", color: "#7A7268", marginTop: "1.5rem" }}>
                  Digest: <code>{error.digest}</code>
                </p>
              )}
            </div>
          </div>
        </main>

        <footer style={{ padding: "1.5rem 2rem", display: "flex", justifyContent: "center", gap: "24px", fontSize: "12px", color: "#7A7268" }}>
          <a href="/impressum" style={{ color: "#7A7268", textDecoration: "none" }}>Impressum</a>
          <a href="/datenschutz" style={{ color: "#7A7268", textDecoration: "none" }}>Datenschutz</a>
          <a href="/agb" style={{ color: "#7A7268", textDecoration: "none" }}>AGB</a>
        </footer>
      </body>
    </html>
  );
}
