-- Add profile_id to meals
ALTER TABLE meals ADD COLUMN profile_id TEXT NOT NULL DEFAULT 'default';

-- Add profile_id to settings and make it unique for UPSERT support
ALTER TABLE settings ADD COLUMN profile_id TEXT NOT NULL DEFAULT 'default';
CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_profile ON settings(profile_id);

-- Index for efficient profile+date queries
CREATE INDEX IF NOT EXISTS idx_meals_profile_date ON meals(profile_id, date);
