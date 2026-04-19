ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "share_token" text;
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_share_token_idx" ON "sessions"("share_token") WHERE "share_token" IS NOT NULL;
