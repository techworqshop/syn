import io,sys
p="/root/synweb/app/src/app/api/n8n/callback/route.ts"
s=io.open(p,encoding="utf-8").read()
new=io.open("/root/synweb/.scratch/auto_synth.txt",encoding="utf-8").read().rstrip("\n")
old1='import { eq, asc, and, ne } from "drizzle-orm";'
new1='import { eq, asc, and, ne, sql } from "drizzle-orm";'
old2='  await publish(`session:${b.sessionId}`, { type: "message", message: row });\n\n\n  // If session has reached final round'
def rep(o,n,l):
    global s
    c=s.count(o)
    if c!=1: print("MISS",l,c); sys.exit(1)
    s=s.replace(o,n); print("OK",l)
rep(old1,new1,"import")
rep(old2,new,"trigger")
io.open(p,"w",encoding="utf-8").write(s); print("WROTE",len(s))
