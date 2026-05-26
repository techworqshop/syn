-- 0015: locale per session for n8n-status translation
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'de';
