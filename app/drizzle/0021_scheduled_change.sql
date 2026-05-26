-- Track scheduled subscription change (downgrade) until term-end
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS scheduled_plan_item_price_id text,
  ADD COLUMN IF NOT EXISTS scheduled_change_at timestamptz;
