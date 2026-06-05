import io
p = "/root/synweb/app/src/app/share/[token]/page.tsx"
s = io.open(p, encoding="utf-8").read()
old = '            <span className="hidden sm:inline">.md</span>\n            <span className="sm:hidden">.md</span>'
new = '            <span>.md</span>'
assert old in s, "md spans not found"
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8").write(s)
print("simplified md button OK")
