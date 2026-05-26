-- 0017: Session quota tracking (consumed sessions per billing period + purchased extras)

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS first_message_at timestamptz;

CREATE TABLE IF NOT EXISTS session_consumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  period_start timestamptz NOT NULL,
  consumed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS session_consumptions_session_unique ON session_consumptions(session_id);
CREATE INDEX IF NOT EXISTS session_consumptions_user_period_idx ON session_consumptions(user_id, period_start);

CREATE TABLE IF NOT EXISTS purchased_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  quantity integer NOT NULL,
  chargebee_invoice_id text,
  chargebee_charge_id text,
  unit_price_eur integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS purchased_extras_user_period_idx ON purchased_extras(user_id, period_start);
