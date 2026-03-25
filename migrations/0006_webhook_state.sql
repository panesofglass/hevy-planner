ALTER TABLE users ADD COLUMN webhook_id TEXT;
ALTER TABLE users ADD COLUMN webhook_auth_token TEXT;
ALTER TABLE users ADD COLUMN last_sync_at TEXT;
