CREATE TABLE IF NOT EXISTS "invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL,
  "token" text NOT NULL UNIQUE,
  "invited_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "used_at" timestamptz,
  "expires_at" timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "invites_token_idx" ON "invites"("token");
CREATE INDEX IF NOT EXISTS "invites_email_idx" ON "invites"("email");
