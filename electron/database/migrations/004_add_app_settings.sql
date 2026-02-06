CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

INSERT INTO schema_migrations (version, applied_at) VALUES (4, datetime('now'));
