-- Settings-Feature: Email-Change-Flow + Account-Deletion-Request
-- Idempotent.

-- 1) users.deletion_requested_at: NULL = aktiv, sonst Zeitpunkt der
--    Loesch-Anforderung. Auth-Layer verweigert Login wenn gesetzt.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz;

-- 2) email_change_tokens: hier landet das ANGEFORDERTE neue Email,
--    bis der User dieses bestaetigt hat. Bestaetigung swappt
--    users.email auf new_email.
CREATE TABLE IF NOT EXISTS email_change_tokens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  new_email   text        NOT NULL,
  token       text        NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_change_tokens_token_idx
  ON email_change_tokens (token);
CREATE INDEX IF NOT EXISTS email_change_tokens_user_idx
  ON email_change_tokens (user_id);
