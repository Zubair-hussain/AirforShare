-- Airforshare D1 Schema
-- Run with: wrangler d1 execute airforshare-db --file=./schema.sql --remote

CREATE TABLE IF NOT EXISTS shares (
  id                  TEXT PRIMARY KEY,
  room_code           TEXT UNIQUE NOT NULL,
  type                TEXT NOT NULL CHECK(type IN ('file', 'text')),
  content             TEXT,
  file_key            TEXT,
  file_name           TEXT,
  file_size           INTEGER,
  file_size_original  INTEGER,
  file_type           TEXT,
  is_compressed       INTEGER DEFAULT 0,
  network_private     INTEGER DEFAULT 0,
  expires_at          INTEGER NOT NULL,
  created_at          INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_room_code ON shares(room_code);
CREATE INDEX IF NOT EXISTS idx_expires_at ON shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_network_private ON shares(network_private);
CREATE INDEX IF NOT EXISTS idx_created_at ON shares(created_at);