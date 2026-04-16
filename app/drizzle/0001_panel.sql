CREATE TABLE IF NOT EXISTS "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" text NOT NULL DEFAULT 'Neue Fokusgruppe',
  "problem_brief" text,
  "status" text NOT NULL DEFAULT 'discovery',
  "rigidity_score" integer NOT NULL DEFAULT 5,
  "persona_count" integer NOT NULL DEFAULT 0,
  "current_round" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "sessions_user_idx" ON "sessions"("user_id");

CREATE TABLE IF NOT EXISTS "personas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL REFERENCES "sessions"("id") ON DELETE CASCADE,
  "slot" integer NOT NULL,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "core_perspective" text NOT NULL,
  "profile" text NOT NULL,
  "position_summary" text,
  "round_1_response" text,
  "round_2_response" text,
  "round_3_response" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "personas_session_idx" ON "personas"("session_id");

CREATE TABLE IF NOT EXISTS "syntheses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL REFERENCES "sessions"("id") ON DELETE CASCADE,
  "round_number" integer NOT NULL,
  "synthesis_text" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "syntheses_session_idx" ON "syntheses"("session_id");

CREATE TABLE IF NOT EXISTS "messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL REFERENCES "sessions"("id") ON DELETE CASCADE,
  "role" text NOT NULL,
  "persona_slot" integer,
  "persona_name" text,
  "content" text NOT NULL,
  "round_number" integer,
  "metadata" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "messages_session_idx" ON "messages"("session_id");

CREATE TABLE IF NOT EXISTS "audience_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL REFERENCES "sessions"("id") ON DELETE CASCADE,
  "persona_slot" integer NOT NULL,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "audience_session_persona_idx" ON "audience_messages"("session_id","persona_slot");

CREATE TABLE IF NOT EXISTS "files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL REFERENCES "sessions"("id") ON DELETE CASCADE,
  "file_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "storage_path" text NOT NULL,
  "summary" text,
  "size_bytes" integer NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "files_session_idx" ON "files"("session_id");
