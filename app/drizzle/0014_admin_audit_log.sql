-- Admin-Audit-Trail: protokolliert sensitive Admin-Aktionen.
-- Idempotent.
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_email text        NOT NULL,
  action      text        NOT NULL,
  target_type text,
  target_id   uuid,
  metadata    jsonb,
  ip          text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_actor_idx   ON admin_audit_log (actor_id);
CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_action_idx  ON admin_audit_log (action);
