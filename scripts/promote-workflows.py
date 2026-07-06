#!/usr/bin/env python3
"""promote-workflows.py - laeuft AUF syn-prod-1. Promotet EINZELNE DEV-Workflow-JSONs
aus dem Repo nach PROD-n8n. Selektiv, nie alle. IDs/Hosts/Webhook-Pfade werden
transformiert; Credential- und DataTable-IDs sind identisch (kein Remap).
Aufruf: python3 scripts/promote-workflows.py [--dry-run] SynWeb_Name [SynWeb_Name ...]"""
import json, subprocess, sys, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = HERE + "/../infra/synweb-workflows"
N8N = "n8n-n8n-web-1"
IDMAP = json.load(open(BASE + "/id-map.json"))
def fix_webhook(m):
    path = m.group(1)
    if path.endswith("-prod"): path = path[:-5]
    return "https://n8n.asksyn.com" + path + "-prod"
def transform(wf):
    if not wf["name"].endswith("_prod"): wf["name"] += "_prod"
    dev = wf.get("id")
    if dev not in IDMAP: sys.exit("kein prod-mapping fuer id " + str(dev) + " (" + wf["name"] + ")")
    wf["id"] = IDMAP[dev]
    for k in ("versionId","active","tags","pinData","shared","triggerCount","meta"): wf.pop(k, None)
    s = json.dumps(wf)
    s = re.sub(r"https://n8n\.worqshop\.io(/webhook/[A-Za-z0-9/_-]+)", fix_webhook, s)
    s = s.replace("n8n.worqshop.io", "n8n.asksyn.com").replace("syn.worqshop.io", "asksyn.com")
    wf = json.loads(s)
    for node in wf.get("nodes", []):
        p = node.setdefault("parameters", {})
        if node.get("type") == "n8n-nodes-base.webhook":
            path = p.get("path", "")
            if path and not path.endswith("-prod"): p["path"] = path + "-prod"
        wid = p.get("workflowId")
        if isinstance(wid, dict) and wid.get("value") in IDMAP: wid["value"] = IDMAP[wid["value"]]
    return wf
def api(pid, action):
    key = next(l.split("=",1)[1].strip() for l in open("/root/n8n/.env") if l.startswith("N8N_MCP_API_KEY="))
    subprocess.run(["curl","-sS","-o","/dev/null","-X","POST","-H","X-N8N-API-KEY: " + key, "https://n8n.asksyn.com/api/v1/workflows/" + pid + "/" + action], capture_output=True)
def do_import(wf):
    out = "/tmp/prom_" + wf["id"] + ".json"
    json.dump([wf], open(out, "w"))
    subprocess.run(["docker","cp",out,N8N + ":/tmp/imp.json"], check=True, capture_output=True)
    r = subprocess.run(["docker","exec",N8N,"n8n","import:workflow","--input=/tmp/imp.json"], capture_output=True, text=True)
    if r.returncode != 0: sys.exit("import FAIL " + wf["name"] + ": " + (r.stderr or r.stdout)[:300])
args = sys.argv[1:]
dry = "--dry-run" in args
names = [a for a in args if not a.startswith("--")]
if not names: sys.exit("usage: promote-workflows.py [--dry-run] SynWeb_Name [...]")
for name in names:
    src = BASE + "/" + name + ".json"
    if not os.path.exists(src): sys.exit("nicht im Repo: " + src)
    data = json.load(open(src))
    wf = data[0] if isinstance(data, list) else data
    tw = transform(wf)
    tag = "[dry] " if dry else ""
    print(tag + name + " -> " + tw["name"] + " (id " + tw["id"] + ", " + str(len(tw.get("nodes", []))) + " nodes)")
    if dry: continue
    do_import(tw)
    api(tw["id"], "deactivate"); api(tw["id"], "activate")
    print("   importiert + aktiviert")
print("fertig" + (" (dry-run, nichts geaendert)" if dry else ""))
