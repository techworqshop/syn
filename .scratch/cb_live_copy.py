#!/usr/bin/env python3
# Kopiert Syn-Katalog von worqshop-test auf die LIVE-Site + legt PROD-Webhook an.
# Aufruf: python3 cb_live_copy.py <LIVE_SITE> <LIVE_FULL_KEY> <WEBHOOK_PASS>
import sys, requests
TEST_SITE="worqshop-test"
def envval(k, f="/root/synweb/.env"):
    for ln in open(f):
        if ln.startswith(k+"="): return ln.strip().split("=",1)[1]
    return ""
TEST_KEY=envval("CHARGEBEE_API_KEY")
LIVE_SITE, LIVE_KEY, WH_PASS = sys.argv[1], sys.argv[2], sys.argv[3]
T="https://"+TEST_SITE+".chargebee.com/api/v2"
L="https://"+LIVE_SITE+".chargebee.com/api/v2"
ta=(TEST_KEY,""); la=(LIVE_KEY,"")
def get(base,auth,path,params=None):
    r=requests.get(base+path,auth=auth,params=params or {}); r.raise_for_status(); return r.json()
def post(path,data):
    r=requests.post(L+path,auth=la,data=data)
    if r.status_code==400 and ("already" in r.text.lower() or "duplicate" in r.text.lower()):
        print("  skip (exists)"); return None
    if r.status_code>=400: print("  ERR", r.status_code, r.text[:200]); sys.exit(1)
    return r.json()
fam=[f["item_family"] for f in get(T,ta,"/item_families")["list"] if f["item_family"]["id"]=="synweb"][0]
print("family synweb"); post("/item_families",{"id":"synweb","name":fam["name"]})
for it in get(T,ta,"/items",{"limit":30})["list"]:
    i=it["item"]
    if i.get("item_family_id")!="synweb": continue
    print("item", i["id"])
    d={"id":i["id"],"name":i["name"],"type":i["type"],"item_family_id":"synweb"}
    if i.get("external_name"): d["external_name"]=i["external_name"]
    post("/items", d)
for ip in get(T,ta,"/item_prices",{"limit":30})["list"]:
    p=ip["item_price"]
    if not p["id"].startswith("syn-"): continue
    print("price", p["id"])
    d={"id":p["id"],"item_id":p["item_id"],"name":p["name"],"currency_code":p["currency_code"],"price":p["price"],"pricing_model":p.get("pricing_model","flat_fee"),"period":p.get("period"),"period_unit":p.get("period_unit")}
    if p.get("external_name"): d["external_name"]=p["external_name"]
    post("/item_prices", {k:v for k,v in d.items() if v is not None})
print("webhook Syn PROD Callback (live)")
post("/webhook_endpoints",{"name":"Syn PROD Callback","url":"https://app.asksyn.com/api/chargebee/webhook","basic_auth_username":"synweb-prod-cb","basic_auth_password":WH_PASS,"send_card_resource":"true"})
print("DONE - Katalog + Webhook auf Live-Site angelegt")
