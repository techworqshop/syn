-- 0020: Extras-Container - 1-Jahr-Gueltigkeit + Base-first Allocation

ALTER TABLE purchased_extras ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE purchased_extras ADD COLUMN IF NOT EXISTS quantity_used integer NOT NULL DEFAULT 0;

-- Backfill: existing rows expire 1 year after creation
UPDATE purchased_extras
   SET expires_at = created_at + interval '1 year'
 WHERE expires_at IS NULL;

CREATE INDEX IF NOT EXISTS purchased_extras_expires_idx ON purchased_extras(expires_at);
CREATE INDEX IF NOT EXISTS purchased_extras_user_avail_idx ON purchased_extras(user_id, expires_at);

ALTER TABLE session_consumptions ADD COLUMN IF NOT EXISTS credit_id uuid REFERENCES purchased_extras(id) ON DELETE SET NULL;
