// Lightweight i18n: cookie-based locale + flat dictionary + t() helper.
// Cookie `syn.locale` = "de" | "en". Default "de".

export type Locale = "de" | "en";
export const DEFAULT_LOCALE: Locale = "de";
export const LOCALES: Locale[] = ["de", "en"];
export const COOKIE_NAME = "syn.locale";

type Dict = Record<string, { de: string; en: string }>;

export const DICT: Dict = {
  // ============================================================
  // Navigation / Layout
  // ============================================================
  "nav.help_title":    { de: "So funktioniert Syn",            en: "How Syn works" },
  "nav.admin":         { de: "Admin",                          en: "Admin" },
  "nav.logout":        { de: "Logout",                         en: "Logout" },

  // ============================================================
  // Login
  // ============================================================
  "login.subtitle":    { de: "Melde dich mit deinem Account an.", en: "Sign in to your account." },
  "login.email":       { de: "Email",                          en: "Email" },
  "login.password":    { de: "Passwort",                       en: "Password" },
  "login.submit":      { de: "Einloggen",                      en: "Sign in" },

  // ============================================================
  // Dashboard
  // ============================================================
  "dashboard.title":       { de: "Fokusgruppen",                                   en: "Focus groups" },
  "dashboard.subtitle":    { de: "Deine synthetischen Panels. Klick auf eine Session um fortzusetzen.", en: "Your synthetic panels. Click a session to continue." },
  "dashboard.new":         { de: "Neue Fokusgruppe",                               en: "New focus group" },
  "dashboard.empty.title": { de: "Noch keine Fokusgruppe.",                        en: "No focus group yet." },
  "dashboard.empty.cta":   { de: "Klick oben auf Neue Fokusgruppe um zu starten.", en: "Click 'New focus group' above to get started." },
  "dashboard.closed":      { de: "Abgeschlossen",                                  en: "Completed" },
  "dashboard.round":       { de: "Runde",                                          en: "Round" },
  "dashboard.personas":    { de: "Personas",                                       en: "Personas" },

  // ============================================================
  // Session / Chat
  // ============================================================
  "chat.placeholder.idle":   { de: "Nachricht an Syn...",                                       en: "Message Syn..." },
  "chat.placeholder.busy":   { de: "Syn arbeitet — du kannst schon vorschreiben, senden geht gleich wieder ...", en: "Syn is working — you can keep typing, send will be available again shortly..." },
  "chat.send":               { de: "Senden",                                                    en: "Send" },
  "chat.upload":             { de: "Dateien hochladen",                                         en: "Upload files" },
  "chat.thinking":           { de: "Syn denkt nach...",                                         en: "Syn is thinking..." },
  "chat.empty":              { de: "Starte die Fokusgruppe. Beschreib dein Thema (du kannst auch Dateien reinziehen), und Syn fuehrt dich durch.", en: "Start the focus group. Describe your topic (you can drop in files), and Syn will guide you." },
  "chat.allSessions":        { de: "Alle Sessions",                                             en: "All sessions" },
  "chat.round":              { de: "Runde",                                                     en: "Round" },
  "chat.round3Done":         { de: "Runde 3 abgeschlossen",                                     en: "Round 3 completed" },
  "chat.personasShort":      { de: "Personas",                                                  en: "Personas" },
  "chat.filesShort":         { de: "Dateien",                                                   en: "Files" },

  "chat.closed.title":   { de: "Diskussion abgeschlossen.",                                                            en: "Discussion completed." },
  "chat.closed.hint":    { de: "Abschlussbericht via 3-Punkte-Menü · 1:1-Chat mit Personas in der Sidebar",            en: "Final report via 3-dot menu · 1:1 chat with personas in the sidebar" },

  "chat.mehr_lesen":     { de: "Mehr lesen",      en: "Read more" },
  "chat.weniger":        { de: "Weniger anzeigen", en: "Show less" },

  // ============================================================
  // Roles
  // ============================================================
  "role.user":         { de: "Du",          en: "You" },
  "role.coordinator":  { de: "Syn",         en: "Syn" },
  "role.persona":      { de: "Persona",     en: "Persona" },
  "role.synthesis":    { de: "Synthese",    en: "Synthesis" },
  "role.synthesisRound":{ de: "Synthese Runde", en: "Synthesis Round" },
  "role.system":       { de: "System",      en: "System" },
  "role.error":        { de: "Fehler",      en: "Error" },

  // ============================================================
  // Persona Sidebar
  // ============================================================
  "sidebar.personas":      { de: "Personas",        en: "Personas" },
  "sidebar.syntheses":     { de: "Synthesen",       en: "Syntheses" },
  "sidebar.haltung":       { de: "Haltung",         en: "Stance" },
  "sidebar.collapse":      { de: "Sidebar einklappen", en: "Collapse sidebar" },
  "sidebar.expand":        { de: "Sidebar ausklappen", en: "Expand sidebar" },
  "sidebar.notAssigned":   { de: "Noch nicht zugewiesen", en: "Not assigned yet" },
  "sidebar.persona":       { de: "Persona",         en: "Persona" },
  "sidebar.perspektive":   { de: "Perspektive",     en: "Perspective" },
  "sidebar.profil":        { de: "Profil",          en: "Profile" },
  "sidebar.position":      { de: "Aktuelle Position", en: "Current position" },
  "sidebar.runde":         { de: "Runde",           en: "Round" },

  "stance.offen":          { de: "offen",           en: "open" },
  "stance.ausgewogen":     { de: "ausgewogen",      en: "balanced" },
  "stance.standhaft":      { de: "standhaft",       en: "firm" },

  // ============================================================
  // SessionMenu
  // ============================================================
  "menu.report":        { de: "Abschlussbericht (PDF)", en: "Final report (PDF)" },
  "menu.chatPdf":       { de: "Chat-Verlauf PDF",       en: "Chat log PDF" },
  "menu.share":         { de: "Teilen",                 en: "Share" },
  "menu.delete":        { de: "Loeschen",               en: "Delete" },
  "menu.share.copied":  { de: "Link kopiert",           en: "Link copied" },
  "menu.share.close":   { de: "Schliessen",             en: "Close" },
  "menu.share.revoke":  { de: "Link widerrufen",        en: "Revoke link" },
  "menu.confirm.delete":{ de: "Fokusgruppe und alle Inhalte loeschen?", en: "Delete focus group and all its content?" },

  // ============================================================
  // Files / Upload
  // ============================================================
  "files.briefing":     { de: "Briefing",          en: "Briefing" },
  "files.persona":      { de: "Persona-Daten",     en: "Persona data" },
  "files.panel":        { de: "Panel-Review",      en: "Panel review" },
  "files.delete":       { de: "Datei loeschen",    en: "Delete file" },

  "upload.title":       { de: "Dateien hochladen", en: "Upload files" },
  "upload.subtitle":    { de: "Drag + Drop oder Klick zum Auswaehlen. Mehrere Dateien moeglich.", en: "Drag & drop or click to select. Multiple files supported." },
  "upload.dragHere":    { de: "Dateien hierher ziehen", en: "Drag files here" },
  "upload.orClick":     { de: "oder klicken zum Auswaehlen", en: "or click to select" },
  "upload.close":       { de: "Schliessen",        en: "Close" },
  "upload.none":        { de: "Keine Dateien ausgewaehlt", en: "No files selected" },
  "upload.count":       { de: "Dateien",           en: "files" },
  "upload.uploadBtn":   { de: "hochladen",         en: "upload" },
  "upload.uploading":   { de: "Laedt...",          en: "Loading..." },
  "upload.done":        { de: "Fertig",            en: "Done" },
  "upload.uploadedAnalyzing": { de: "Hochgeladen - wird analysiert...", en: "Uploaded — analysing..." },
  "upload.error":       { de: "Fehler",            en: "Error" },

  // ============================================================
  // Language Switch
  // ============================================================
  "lang.de":            { de: "Deutsch",     en: "German" },
  "lang.en":            { de: "Englisch",    en: "English" },

  // ============================================================
  // Admin Page
  // ============================================================
  "admin.title":         { de: "Admin",            en: "Admin" },
  "admin.analytics":     { de: "Analytics",        en: "Analytics" },
  "admin.users":         { de: "Users",            en: "Users" },
  "admin.sessions":      { de: "Sessions",         en: "Sessions" },
  "admin.errors":        { de: "Errors",           en: "Errors" },
  "admin.invites":       { de: "Invites",          en: "Invites" },

  "admin.filter.placeholder.users":    { de: "Filter nach Email oder Name...",                                          en: "Filter by email or name..." },
  "admin.filter.placeholder.sessions": { de: "Filter nach Session-Titel, User-Email oder Name...",                       en: "Filter by session title, user email or name..." },
  "admin.filter.placeholder.errors":   { de: "Filter nach Email, User-Name, Session-Titel oder Error-Inhalt...",         en: "Filter by email, user name, session title or error content..." },
  "admin.filter.placeholder.invites":  { de: "Filter nach Email oder Eingeladen-von...",                                 en: "Filter by email or invited-by..." },
  "admin.filter.placeholder.topUsers": { de: "Top User filtern (Email oder Name)...",                                    en: "Filter top users (email or name)..." },
  "admin.filter.reset":  { de: "Filter zuruecksetzen", en: "Reset filter" },

  "admin.users.subtitle":     { de: "Accounts insgesamt. Klick einen User um die Detail-Ansicht zu sehen.", en: "accounts total. Click a user to see details." },
  "admin.users.filtered":     { de: "von {total} Accounts gefiltert",                                       en: "of {total} accounts filtered" },
  "admin.users.kick":         { de: "Kicken",                                                                en: "Kick" },
  "admin.users.confirmKick":  { de: "loeschen? Alle Sessions dieses Users gehen damit auch verloren.",       en: "delete? All sessions of this user will be lost too." },

  "admin.session.locked":     { de: "Abgeschlossen",          en: "Completed" },
  "admin.session.open":       { de: "Offen",                  en: "Open" },
  "admin.session.all":        { de: "Alle",                   en: "All" },
  "admin.session.readonly":   { de: "Admin-Read-Only",        en: "Admin read-only" },
  "admin.session.back":       { de: "← Alle Sessions",        en: "← All sessions" },
  "admin.session.owner":      { de: "Owner",                  en: "Owner" },
  "admin.session.title":      { de: "Session",                en: "Session" },
  "admin.session.round":      { de: "Runde",                  en: "Round" },
  "admin.session.personas":   { de: "Personas",               en: "Personas" },
  "admin.session.msgs":       { de: "Msgs",                   en: "Msgs" },
  "admin.session.files":      { de: "Files",                  en: "Files" },
  "admin.session.updated":    { de: "Aktualisiert",           en: "Updated" },

  "admin.csv":                { de: "CSV",                    en: "CSV" },
  "admin.csv.title":          { de: "Sichtbare Zeilen als CSV exportieren", en: "Export visible rows as CSV" },

  "admin.error.where":        { de: "Fehler beim Laden",      en: "Error while loading" },
  "admin.error.stack":        { de: "Stack-Trace",            en: "Stack trace" },
  "admin.error.logsHint":     { de: "Der Stack wurde auch in die Server-Logs geschrieben",       en: "The stack was also written to the server logs" },

  // Errors-Page
  "errors.title":             { de: "Errors & Stuck Sessions",                          en: "Errors & stuck sessions" },
  "errors.stuck.title":       { de: "Stuck Sessions",                                   en: "Stuck sessions" },
  "errors.stuck.hint":        { de: "Offene Sessions wo der User auf Antwort wartet (letzte Message vom User, >15 Min inaktiv).", en: "Open sessions where the user waits for a reply (last message from user, idle >15 min)." },
  "errors.stuck.none":        { de: "Keine hängenden Sessions. 👍",                     en: "No stuck sessions. 👍" },
  "errors.stuck.idle":        { de: "Min idle",                                         en: "min idle" },
  "errors.abandoned.title":   { de: "Verlassene Sessions",                              en: "Abandoned sessions" },
  "errors.abandoned.hint":    { de: "Sessions die erstellt aber nie geschrieben wurden (keine einzige Message, >1 Std alt).", en: "Sessions that were created but never written in (no message at all, >1 hour old)." },
  "errors.abandoned.none":    { de: "Keine verlassenen Sessions.",                      en: "No abandoned sessions." },
  "errors.abandoned.created": { de: "vor {n} Tag{plural} erstellt",                     en: "created {n} day{plural} ago" },
  "errors.last50.title":      { de: "Letzte 50 Errors",                                 en: "Last 50 errors" },
  "errors.last50.none":       { de: "Keine Errors. 🎉",                                 en: "No errors. 🎉" },

  // Invites-Page
  "invites.subtitle.parts":   { de: "offen · {used} verbraucht · {expired} abgelaufen", en: "open · {used} used · {expired} expired" },
  "invites.open":             { de: "Offene Einladungen",                               en: "Open invites" },
  "invites.none":             { de: "Keine offenen Einladungen.",                       en: "No open invites." },
  "invites.invitedBy":        { de: "Eingeladen von",                                   en: "Invited by" },
  "invites.validUntil":       { de: "gültig bis",                                        en: "valid until" },
  "invites.used":             { de: "Verbraucht",                                       en: "Used" },
  "invites.redeemedOn":       { de: "eingelöst",                                         en: "redeemed" },
  "invites.expired":          { de: "Abgelaufen",                                       en: "Expired" },
  "invites.create.label":     { de: "Email einladen",                                   en: "Invite email" },
  "invites.create.placeholder":{ de: "kollege@firma.com",                               en: "colleague@company.com" },
  "invites.create.submit":    { de: "Einladen",                                         en: "Invite" },
  "invites.create.mailed":    { de: "Einladung per Mail verschickt.",                   en: "Invite sent via email." },
  "invites.create.generated": { de: "Invite-Link generiert.",                           en: "Invite link generated." },
  "invites.revoke":           { de: "Widerrufen",                                       en: "Revoke" },
  "invites.confirmRevoke":    { de: "Einladung widerrufen?",                            en: "Revoke invite?" },

  // Analytics
  "analytics.subtitle":         { de: "Nutzungsdaten",                                  en: "Usage data" },
  "analytics.range.7d":         { de: "7 Tage",                                         en: "7 days" },
  "analytics.range.30d":        { de: "30 Tage",                                        en: "30 days" },
  "analytics.range.90d":        { de: "90 Tage",                                        en: "90 days" },
  "analytics.range.all":        { de: "Gesamt",                                         en: "All" },
  "analytics.card.users":       { de: "User insgesamt",                                 en: "Users total" },
  "analytics.card.users.sub":   { de: "+{n} im Zeitraum",                               en: "+{n} in range" },
  "analytics.card.sessions":    { de: "Sessions",                                       en: "Sessions" },
  "analytics.card.sessions.sub":{ de: "+{n} im Zeitraum · {pct}% abgeschlossen",         en: "+{n} in range · {pct}% completed" },
  "analytics.card.userMsgs":    { de: "User-Messages",                                  en: "User messages" },
  "analytics.card.userMsgs.sub":{ de: "{total} gesamt im Zeitraum",                     en: "{total} total in range" },
  "analytics.card.audience":    { de: "1:1-Audience",                                   en: "1:1 audience" },
  "analytics.card.audience.sub":{ de: "Fragen an Personas",                             en: "questions to personas" },
  "analytics.card.files":       { de: "Files hochgeladen",                              en: "Files uploaded" },
  "analytics.card.reports":     { de: "Reports generiert",                              en: "Reports generated" },
  "analytics.card.reports.sub": { de: "Abschlussberichte (all-time)",                   en: "Final reports (all-time)" },
  "analytics.card.duration":    { de: "Ø Session-Dauer",                                en: "Avg session duration" },
  "analytics.card.duration.sub":{ de: "Median {n} Min",                                 en: "median {n} min" },
  "analytics.card.tokens":      { de: "LLM-Tokens",                                     en: "LLM tokens" },
  "analytics.card.costs":       { de: "LLM-Kosten (geschätzt)",                         en: "LLM cost (estimated)" },
  "analytics.card.costs.sub":   { de: "alle Modelle",                                   en: "all models" },
  "analytics.n8nUnreachable":   { de: "n8n nicht erreichbar",                           en: "n8n unreachable" },
  "analytics.loading":          { de: "lade...",                                        en: "loading..." },
  "analytics.funnel.title":     { de: "Funnel: Created → Report",                       en: "Funnel: Created → Report" },
  "analytics.funnel.startRate": { de: "Start-Rate",                                     en: "Start rate" },
  "analytics.funnel.r1":        { de: "R1-Completion",                                  en: "R1 completion" },
  "analytics.funnel.r2":        { de: "R2-Completion",                                  en: "R2 completion" },
  "analytics.funnel.r3":        { de: "R3-Completion",                                  en: "R3 completion" },
  "analytics.funnel.report":    { de: "Report-Rate",                                    en: "Report rate" },
  "analytics.funnel.dropoff":   { de: "Total Drop-off",                                 en: "Total drop-off" },
  "analytics.daily":            { de: "Aktivität pro Tag",                              en: "Daily activity" },
  "analytics.hourly":           { de: "Tagesverteilung (Stunden)",                      en: "Hourly distribution" },
  "analytics.fileCats":         { de: "Dateien nach Kategorie",                         en: "Files by category" },
  "analytics.topUsers":         { de: "Top 10 aktive User",                             en: "Top 10 active users" },
  "analytics.modelTable":       { de: "Tokens & Kosten pro Modell",                     en: "Tokens & cost per model" },

  // ============================================================
  // Closed-state Coordinator copy
  // ============================================================
  "coord.closed.message": {
    de: "Damit ist die Diskussion abgeschlossen - Runde 1 Bauchgefuehl, Runde 2 konstruktive Vorschlaege, Runde 3 priorisierte Handlungsliste stehen oben.\n\nWas du jetzt noch tun kannst:\n- Den Abschlussbericht ueber das 3-Punkte-Menue rechts oben generieren (PDF + lesbarer Text-Bubble)\n- Einzelne Personas in der Sidebar anklicken und im 1:1 weiter befragen\n\nDer Haupt-Chat ist hiermit beendet.",
    en: "That concludes the discussion — Round 1 gut feeling, Round 2 constructive suggestions, Round 3 prioritised action list are all above.\n\nWhat you can still do:\n- Generate the final report via the 3-dot menu on the top right (PDF + readable text bubble)\n- Click individual personas in the sidebar to keep asking them 1:1\n\nThe main chat is now closed."
  }
};

export function t(key: string, locale: Locale = DEFAULT_LOCALE, params?: Record<string, string | number>): string {
  const entry = DICT[key];
  if (!entry) return key;
  let s = entry[locale] || entry[DEFAULT_LOCALE] || key;
  if (params) {
    for (const k of Object.keys(params)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(params[k]));
    }
  }
  return s;
}

export function isLocale(v: unknown): v is Locale {
  return v === "de" || v === "en";
}

// Server-side: read cookie. Lazy import damit das Modul auch in client-bundles importiert werden kann.
export async function getLocaleFromCookies(): Promise<Locale> {
  try {
    const { cookies } = await import("next/headers");
    const c = await cookies();
    const v = c.get(COOKIE_NAME)?.value;
    return isLocale(v) ? v : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}
