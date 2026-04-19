ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_admin" boolean NOT NULL DEFAULT false;
UPDATE "users" SET "is_admin" = true WHERE "email" = 'tech@worqshop.io';
