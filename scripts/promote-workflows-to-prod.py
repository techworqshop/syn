#!/usr/bin/env python3
"""
promote-workflows-to-prod.py
Aktualisiert alle 15 Prod-Workflows mit dem Stand der Dev-Workflows.

Algorithmus:
1. Lade Mapping Dev-ID → Prod-ID aus /tmp/wfsplit/dev_to_prod_mapping.json
2. Fuer jedes Dev-Workflow:
   a. Export via n8n CLI
   b. Transform (Name +_prod, URLs syn.worqshop.io→asksyn.com,
      Webhook-Pfade *-prod, Cross-Refs Dev-ID→Prod-ID, ID auf Prod-ID setzen)
   c. Re-import (ueberschreibt die Prod-Variante in-place)
3. Reaktiviere alle Prod-Workflows in Dependency-Reihenfolge
   (leaves zuerst, dann Coordinator, dann Gateway)
"""
import subprocess
import json
import os
import sys

N8N_CONTAINER = "n8n-n8n-web-1"
PG_CONTAINER  = "n8n-postgres-1"
OUTDIR        = "/tmp/wfsplit"
MAPPING_PATH  = f"{OUTDIR}/dev_to_prod_mapping.json"

# Dependency-Reihenfolge (leaves zuerst, dann Mid, dann Top)
ACTIVATION_ORDER = [
    # Leaves (no executeWorkflow refs)
    "SynWeb_RunPersona", "SynWeb_Synthesize", "SynWeb_PostStatus",
    "SynWeb_RunRound", "SynWeb_FinalReport",
    "SynWeb_ReadState", "SynWeb_IngestFile", "SynWeb_DeleteFile",
    "SynWeb_SendInvite", "SynWeb_SendPasswordReset",
    "SynWeb_SendVerifyEmail", "SynWeb_SendEmailChange",
    "SynWeb_Audience",
    # Mid (Coordinator references RunPersona/Synthesize/PostStatus/RunRound)
    "SynWeb_Coordinator",
    # Top (Gateway references Coordinator + Audience)
    "SynWeb_Gateway",
]


def export_workflow(wf_id):
    inp = f"/tmp/exp_{wf_id}.json"
    subprocess.run(["docker", "exec", N8N_CONTAINER, "n8n", "export:workflow",
                    f"--id={wf_id}", f"--output={inp}"], check=True, capture_output=True)
    host = f"{OUTDIR}/dev_{wf_id}.json"
    subprocess.run(["docker", "cp", f"{N8N_CONTAINER}:{inp}", host], check=True, capture_output=True)
    with open(host) as f:
        data = json.load(f)
    return data[0] if isinstance(data, list) else data


def transform(wf, dev_id, dev_to_prod):
    prod_id = dev_to_prod[dev_id]
    if not wf["name"].endswith("_prod"):
        wf["name"] = wf["name"] + "_prod"
    wf["id"] = prod_id
    wf.pop("versionId", None)
    wf.pop("activeVersionId", None)
    wf["active"] = False

    for node in wf.get("nodes", []):
        ntype = node.get("type", "")
        params = node.setdefault("parameters", {})

        if ntype == "n8n-nodes-base.webhook":
            path = params.get("path", "")
            if path and not path.endswith("-prod"):
                params["path"] = path + "-prod"
            if "webhookId" in node and not str(node["webhookId"]).startswith("prod-"):
                node["webhookId"] = f"prod-{node['webhookId']}"

        if ntype == "n8n-nodes-base.httpRequest":
            url = params.get("url", "")
            if "syn.worqshop.io" in url:
                params["url"] = url.replace("syn.worqshop.io", "asksyn.com")

        # Update cross-refs in workflowId fields
        wid = params.get("workflowId")
        if isinstance(wid, dict):
            old = wid.get("value")
            if old in dev_to_prod:
                wid["value"] = dev_to_prod[old]

    return wf


def reimport(wf, prod_id):
    out = f"{OUTDIR}/prod_{prod_id}.json"
    with open(out, "w") as f:
        json.dump([wf], f, indent=2)
    inp = f"/tmp/imp_{prod_id}.json"
    subprocess.run(["docker", "cp", out, f"{N8N_CONTAINER}:{inp}"], check=True, capture_output=True)
    subprocess.run(["docker", "exec", N8N_CONTAINER, "n8n", "import:workflow",
                    f"--input={inp}"], check=True, capture_output=True)


def reactivate(prod_id):
    """deactivate + activate via direct DB + workflow_entity active toggle.
    For webhook registration to refresh, this script uses DB-toggle then signals n8n via SIGUSR2."""
    # Set active=false then true to force re-registration on next workflow load
    subprocess.run(["docker", "exec", PG_CONTAINER, "psql", "-U", "n8n", "-d", "n8n", "-c",
                    f"UPDATE workflow_entity SET active = false WHERE id = '{prod_id}';"],
                   check=True, capture_output=True)
    subprocess.run(["docker", "exec", PG_CONTAINER, "psql", "-U", "n8n", "-d", "n8n", "-c",
                    f"UPDATE workflow_entity SET active = true WHERE id = '{prod_id}';"],
                   check=True, capture_output=True)


def main():
    if not os.path.exists(MAPPING_PATH):
        print(f"✗ Mapping not found at {MAPPING_PATH}", file=sys.stderr)
        sys.exit(1)

    with open(MAPPING_PATH) as f:
        dev_to_prod = json.load(f)

    print(f"Promoting {len(dev_to_prod)} workflows ...")

    # Phase 1: Transform + re-import each
    for dev_id, prod_id in dev_to_prod.items():
        wf = export_workflow(dev_id)
        name = wf["name"]
        wf = transform(wf, dev_id, dev_to_prod)
        reimport(wf, prod_id)
        print(f"  ✓ {name:30s} {dev_id} → {prod_id}")

    # Phase 2: Reactivate (n8n needs Restart to pick up webhook changes properly)
    print()
    print("Restarting n8n to refresh webhook registrations...")
    subprocess.run(["docker", "restart", N8N_CONTAINER], check=True, capture_output=True)
    print("  n8n restarted; webhooks should be live within ~10s.")

    print()
    print("Promote done. Test:")
    print("  curl -sS -X POST https://n8n.worqshop.io/webhook/synweb/inbound-prod ...")


if __name__ == "__main__":
    main()
