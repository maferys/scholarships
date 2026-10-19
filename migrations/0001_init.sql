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
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program TEXT, segment TEXT, query TEXT, category TEXT, label TEXT, lang TEXT,
  created_at TEXT NOT NULL
);
