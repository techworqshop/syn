#!/usr/bin/env bash
# Generates /root/synweb/.env.prod aus .env (dev-template) — neu generierte
# Secrets fuer POSTGRES_PASSWORD und NEXTAUTH_SECRET, alle anderen Felder
# werden domain-spezifisch angepasst (PUBLIC_BASE_URL, NEXTAUTH_URL, etc).
# Idempotent: ueberschreibt nicht wenn .env.prod existiert.
set -euo pipefail
cd /root/synweb

if [ -f .env.prod ]; then
  echo "/.env.prod existiert bereits, skip"
  exit 0
fi

PG_PASS=$(openssl rand -hex 24)
NEXTAUTH_SECRET=$(openssl rand -hex 32)
N8N_CALLBACK_SECRET=$(openssl rand -hex 24)

# Quelle nur fuer "shared" Felder (n8n webhooks, api keys, etc.)
source <(grep -E "^(N8N_WEBHOOK_BASE|SYNWEB_GATEWAY_WEBHOOK|SYNWEB_READSTATE_WEBHOOK|SYNWEB_INGEST_WEBHOOK|SYNWEB_GEN_IMAGE_WEBHOOK|SYNWEB_DELETEFILE_WEBHOOK|SYNWEB_INVITE_WEBHOOK|GOOGLE_AI_API_KEY|N8N_DATABASE_URL|ADMIN_EMAIL|ADMIN_INITIAL_PASSWORD|SYNWEB_CALLBACK_SECRET_HEADER)=" .env)

cat > .env.prod <<EOF
# Generated $(date +%F) — PROD env, NEVER commit
# Separater Stack: synweb-prod-* container, eigene DB + Redis.

POSTGRES_PASSWORD=$PG_PASS
POSTGRES_DB=synweb_prod
POSTGRES_USER=synweb_prod
DATABASE_URL=postgresql://synweb_prod:$PG_PASS@synweb-prod-postgres:5432/synweb_prod
REDIS_URL=redis://synweb-prod-redis:6379

NEXTAUTH_SECRET=$NEXTAUTH_SECRET
NEXTAUTH_URL=https://asksyn.com
AUTH_TRUST_HOST=true
PUBLIC_BASE_URL=https://asksyn.com
APP_PUBLIC_BASE=https://asksyn.com

NODE_ENV=production
HOSTNAME=0.0.0.0

# Shared n8n + admin
N8N_WEBHOOK_BASE=$N8N_WEBHOOK_BASE
N8N_CALLBACK_SECRET=$N8N_CALLBACK_SECRET
SYNWEB_CALLBACK_SECRET_HEADER=$SYNWEB_CALLBACK_SECRET_HEADER
SYNWEB_GATEWAY_WEBHOOK=$SYNWEB_GATEWAY_WEBHOOK
SYNWEB_READSTATE_WEBHOOK=$SYNWEB_READSTATE_WEBHOOK
SYNWEB_INGEST_WEBHOOK=$SYNWEB_INGEST_WEBHOOK
SYNWEB_GEN_IMAGE_WEBHOOK=$SYNWEB_GEN_IMAGE_WEBHOOK
SYNWEB_DELETEFILE_WEBHOOK=$SYNWEB_DELETEFILE_WEBHOOK
SYNWEB_INVITE_WEBHOOK=$SYNWEB_INVITE_WEBHOOK
N8N_DATABASE_URL=$N8N_DATABASE_URL
GOOGLE_AI_API_KEY=$GOOGLE_AI_API_KEY
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_INITIAL_PASSWORD=$ADMIN_INITIAL_PASSWORD
EOF

chmod 600 .env.prod
echo "/.env.prod erstellt. POSTGRES_PASSWORD + NEXTAUTH_SECRET frisch generiert."
echo "ADMIN_EMAIL + ADMIN_INITIAL_PASSWORD aus dev uebernommen (gleiche Login-Credentials fuer Worqshop-Admin auf Prod)."
