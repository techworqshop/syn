import subprocess, json, urllib.request, urllib.error
N8N="n8n-n8n-web-1"
MAP=json.load(open("/root/synweb/infra/synweb-workflows/dev_to_prod_mapping.json"))
THREE={"XU3nxKw5UsLkXJsA":"Y4sB7NFBsdcSXfw9","mAnhua1D7huLHtVt":"AsNpiiGTNL5g3gCn","A3jxDuimyDE2G6uO":"CskmKreTjg3SuMWo"}
env=dict(l.strip().split('=',1) for l in open('/root/n8n/.env') if '=' in l and not l.startswith('#'))
KEY=env['N8N_MCP_API_KEY'].strip().strip('"').strip("'")
BASE="https://n8n.worqshop.io/api/v1"; HEAD={"X-N8N-API-KEY":KEY}
def export_wf(wid):
    subprocess.run(["docker","exec",N8N,"n8n","export:workflow","--id="+wid,"--output=/tmp/e_"+wid+".json"],check=True,capture_output=True)
    subprocess.run(["docker","cp",N8N+":/tmp/e_"+wid+".json","/tmp/e_"+wid+".json"],check=True,capture_output=True)
    d=json.load(open("/tmp/e_"+wid+".json"))
    return d[0] if isinstance(d,list) else d
def transform(wf,dev,prod):
    if not wf["name"].endswith("_prod"): wf["name"]=wf["name"]+"_prod"
    wf["id"]=prod
    wf.pop("versionId",None); wf.pop("activeVersionId",None); wf["active"]=False
    for n in wf.get("nodes",[]):
        t=n.get("type",""); p=n.setdefault("parameters",{})
        if t=="n8n-nodes-base.webhook":
            pa=p.get("path","")
            if pa and not pa.endswith("-prod"): p["path"]=pa+"-prod"
            if "webhookId" in n and not str(n["webhookId"]).startswith("prod-"): n["webhookId"]="prod-"+str(n["webhookId"])
        wid=p.get("workflowId")
        if isinstance(wid,dict) and wid.get("value") in MAP: wid["value"]=MAP[wid["value"]]
    wf=json.loads(json.dumps(wf).replace("syn.worqshop.io","asksyn.com"))
    return wf
def reimport(wf,prod):
    json.dump([wf],open("/tmp/i_"+prod+".json","w"),indent=2)
    subprocess.run(["docker","cp","/tmp/i_"+prod+".json",N8N+":/tmp/i_"+prod+".json"],check=True,capture_output=True)
    r=subprocess.run(["docker","exec",N8N,"n8n","import:workflow","--input=/tmp/i_"+prod+".json"],capture_output=True,text=True)
    return r.returncode,(r.stdout or r.stderr).strip()[-100:]
for dev,prod in THREE.items():
    wf=export_wf(dev); nm=wf["name"]; wf=transform(wf,dev,prod); rc,msg=reimport(wf,prod)
    print(nm,"|",dev,"->",prod,"| rc",rc,"|",msg)
for prod in THREE.values():
    try:
        urllib.request.urlopen(urllib.request.Request(BASE+"/workflows/"+prod+"/activate",data=b'',headers={**HEAD,"Content-Type":"application/json"},method="POST"))
        print("activated",prod)
    except urllib.error.HTTPError as e:
        print("activate FAIL",prod,e.code,e.read().decode()[:150])
