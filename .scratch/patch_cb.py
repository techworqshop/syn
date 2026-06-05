import io,sys
b="/root/synweb/.scratch/"
p="/root/synweb/app/src/app/api/n8n/callback/route.ts"
s=io.open(p,encoding="utf-8").read()
func=io.open(b+"panelblock.ts.txt",encoding="utf-8").read().rstrip("\n")
disp=io.open(b+"dispatch_open.ts.txt",encoding="utf-8").read().rstrip("\n")
def rep(o,n,l):
    global s
    c=s.count(o)
    if c!=1: print("MISS",l,c); sys.exit(1)
    s=s.replace(o,n); print("OK",l)
rep("  return { cleanText, ops };\n}","  return { cleanText, ops };\n}\n"+func+"\n","A")
rep("  let phaseOps: PhaseOp[] = [];","  let phaseOps: PhaseOp[] = [];\n  let panelOps: PanelOp[] = [];","B")
rep("    phaseOps = parsed.ops;\n  }","    phaseOps = parsed.ops;\n    const pb = parsePanelBlock(text);\n    text = pb.cleanText;\n    panelOps = pb.ops;\n  }","C")
rep('  if (role === "coordinator" && phaseOps.length > 0) {','  if (role === "coordinator" && (phaseOps.length > 0 || panelOps.length > 0)) {',"D")
rep("    if (proposeUrl && personaOps.length > 0) {",disp,"E")
io.open(p,"w",encoding="utf-8").write(s)
print("WROTE",len(s))
