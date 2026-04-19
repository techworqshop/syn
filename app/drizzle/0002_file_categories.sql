ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "category" text NOT NULL DEFAULT 'panel';
CREATE INDEX IF NOT EXISTS "files_category_idx" ON "files"("category");
