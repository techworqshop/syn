#!/usr/bin/env python3
import subprocess
SID="a507c280-337c-4026-8129-c3816b5d1228"
N2I={"Aiyana Cole":"aiyana","Kenji Tanaka":"kenji","Leo Brandstaetter":"leo","Leo Brandstätter":"leo","Maya Reinhardt":"maya"}

def fetch(name):
    sql = f"SELECT content FROM messages WHERE session_id='{SID}' AND role='persona' AND round_number=1 AND persona_name='{name}' ORDER BY created_at DESC LIMIT 1;"
    r = subprocess.run(["docker","exec","synweb-postgres","psql","-U","synweb","-d","synweb","-t","-A","-c",sql], capture_output=True, text=True, check=True)
    return r.stdout.rstrip("\n")

def update(pid, content):
    tag = "BFILL507"
    while f"${tag}$" in content:
        tag += "X"
    sql = f"UPDATE \"data_table_user_oAfVlk69fSh57ABR\" SET round_1_response = ${tag}${content}${tag}$, position_summary = ${tag}${content}${tag}$ WHERE session_id='{SID}' AND persona_id='{pid}';"
    r = subprocess.run(["docker","exec","-i","n8n-postgres-1","psql","-U","n8n","-d","n8n"], input=sql, capture_output=True, text=True)
    return r.returncode, r.stdout.strip(), r.stderr.strip()

done = set()
for name, pid in N2I.items():
    if pid in done: continue
    c = fetch(name)
    if not c:
        print(f"[skip] {name}")
        continue
    rc, out, err = update(pid, c)
    print(f"[{pid}] from={name!r} len={len(c)} rc={rc} out={out!r} err={err!r}")
    done.add(pid)
