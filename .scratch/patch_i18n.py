import io
p = "/root/synweb/app/src/lib/i18n.ts"
s = io.open(p, encoding="utf-8").read()

anchor = '  "menu.chatPdf":       { de: "Chat-Verlauf PDF",       en: "Chat log PDF" },'
assert anchor in s, "menu.chatPdf anchor not found"

add = anchor + '\n' + '\n'.join([
  '  "menu.chatMd":        { de: "Chat-Verlauf .md",        en: "Chat log .md" },',
])
s = s.replace(anchor, add, 1)

share_anchor = '  "menu.confirm.delete":{ de: "Fokusgruppe und alle Inhalte loeschen?", en: "Delete focus group and all its content?" },'
assert share_anchor in s, "menu.confirm.delete anchor not found"

share_block = share_anchor + '\n\n' + '\n'.join([
  '  // ============================================================',
  '  // Share-Page (public read-only)',
  '  // ============================================================',
  '  "share.subtitle":     { de: "Geteilte Fokusgruppe - Read only", en: "Shared focus group - read only" },',
  '  "share.files":        { de: "Dateien",                 en: "Files" },',
  '  "share.empty":        { de: "Noch keine Nachrichten.",  en: "No messages yet." },',
])

share_block += '\n' + '\n'.join([
  '  "share.pdf":          { de: "PDF",                      en: "PDF" },',
  '  "share.md":           { de: "Chat-Verlauf (.md)",       en: "Chat log (.md)" },',
  '  "share.cat.briefing": { de: "Briefing",                 en: "Briefing" },',
  '  "share.cat.persona":  { de: "Persona-Daten",            en: "Persona data" },',
  '  "share.cat.panel":    { de: "Panel-Review",             en: "Panel review" },',
])
s = s.replace(share_anchor, share_block, 1)
io.open(p, "w", encoding="utf-8").write(s)
print("patched i18n OK")
