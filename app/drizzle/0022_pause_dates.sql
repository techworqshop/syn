ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS pause_date timestamptz,
  ADD COLUMN IF NOT EXISTS resume_date timestamptz;
