-- 0016: Chargebee subscription mapping
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chargebee_customer_id text NOT NULL,
  chargebee_subscription_id text,
  status text NOT NULL DEFAULT 'inactive',
  plan_item_price_id text,
  current_term_start timestamptz,
  current_term_end timestamptz,
  trial_end timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_unique ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_cb_customer_idx ON subscriptions(chargebee_customer_id);
CREATE INDEX IF NOT EXISTS subscriptions_cb_sub_idx ON subscriptions(chargebee_subscription_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions(status);

CREATE TABLE IF NOT EXISTS billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS billing_events_type_idx ON billing_events(event_type);
CREATE INDEX IF NOT EXISTS billing_events_received_idx ON billing_events(received_at DESC);
