ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "title_locked" boolean NOT NULL DEFAULT false;
