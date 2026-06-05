import io
p = "/root/synweb/app/src/components/SessionMenu.tsx"
s = io.open(p, encoding="utf-8").read()

# 1) add exportMd() right after exportPdf()
old_fn = '  function exportPdf() { setMenu(false); window.location.href = `/api/sessions/${sessionId}/export`; }'
new_fn = old_fn + '\n  function exportMd() { setMenu(false); window.location.href = `/api/sessions/${sessionId}/transcript`; }'
assert old_fn in s, "exportPdf line not found"
s = s.replace(old_fn, new_fn, 1)

# 2) add MD button directly after the chatPdf button
old_btn = '          <button onClick={exportPdf} className="w-full text-left px-3 py-2 hover:bg-amber-100">{t("menu.chatPdf", locale)}</button>'
new_btn = old_btn + '\n          <button onClick={exportMd} className="w-full text-left px-3 py-2 hover:bg-amber-100">{t("menu.chatMd", locale)}</button>'
assert old_btn in s, "chatPdf button not found"
s = s.replace(old_btn, new_btn, 1)

io.open(p, "w", encoding="utf-8").write(s)
print("patched SessionMenu OK")
