-- 0019: Soft-delete sessions via archived_at column. 30 days grace before hard delete.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE INDEX IF NOT EXISTS sessions_archived_at_idx ON sessions(archived_at);
