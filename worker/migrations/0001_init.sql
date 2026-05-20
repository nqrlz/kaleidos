CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  daily_calories INTEGER NOT NULL DEFAULT 2000,
  deficit INTEGER NOT NULL DEFAULT 500
);

INSERT OR IGNORE INTO settings (id, daily_calories, deficit) VALUES (1, 2000, 500);

CREATE TABLE IF NOT EXISTS meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  calories INTEGER NOT NULL,
  items TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date);
