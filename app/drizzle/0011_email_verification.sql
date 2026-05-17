-- Email-Verification Flow:
-- - users.email_verified_at: NULL = unbestaetigt, sonst Zeitpunkt der Bestaetigung
-- - email_verification_tokens: kurzlebige Tokens fuer den Bestaetigungs-Link
--
-- Idempotent. Bestand-User werden grandfathered (email_verified_at = created_at).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

-- Bestaetige alle existierenden User (Grandfather-Migration)
UPDATE users
   SET email_verified_at = created_at
 WHERE email_verified_at IS NULL;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       text        NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_verification_tokens_token_idx
  ON email_verification_tokens (token);
CREATE INDEX IF NOT EXISTS email_verification_tokens_user_idx
  ON email_verification_tokens (user_id);
