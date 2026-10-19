-- Cloudflare D1 schema. No IP addresses or user agents are stored.
CREATE TABLE IF NOT EXISTS subscribers (
  email TEXT PRIMARY KEY,
  lang TEXT NOT NULL,
  state TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program TEXT, category TEXT, rule TEXT, label TEXT, query TEXT,
  message TEXT NOT NULL, email TEXT, lang TEXT,
  created_at TEXT NOT NULL
);
-- Anonymous finder usage: sanitized search text (no emails or phone numbers), program, label, hour.
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program TEXT, query TEXT, label TEXT,
  created_at TEXT NOT NULL
);
