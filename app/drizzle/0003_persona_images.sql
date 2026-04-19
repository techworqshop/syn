CREATE TABLE IF NOT EXISTS "persona_images" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL REFERENCES "sessions"("id") ON DELETE CASCADE,
  "slot" integer NOT NULL,
  "storage_path" text NOT NULL,
  "mime_type" text NOT NULL DEFAULT 'image/png',
  "status" text NOT NULL DEFAULT 'ready',
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "persona_images_session_slot_idx" ON "persona_images"("session_id","slot");
