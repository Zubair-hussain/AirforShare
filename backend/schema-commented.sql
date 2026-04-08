-- ============================================================================
-- AirForShare Database Schema - Cloudflare D1 (SQLite)
-- ============================================================================
-- This is the PRIMARY and FREE database for AirForShare
-- Uses Cloudflare D1 - included free with Workers
-- Free tier: 5GB storage (more than enough for file metadata)
-- 
-- Run this with:
-- wrangler d1 execute airforshare-db --file=./schema.sql
-- ============================================================================

-- ============================================================================
-- MAIN TABLE: shares
-- ============================================================================
-- Stores all file and text shares
-- Supports both file uploads and text/link sharing
--
CREATE TABLE IF NOT EXISTS shares (
  -- Unique identifiers
  id                  TEXT PRIMARY KEY,                    -- Auto-generated UUID
  room_code           TEXT UNIQUE NOT NULL,                -- 6-digit code (123456)
  
  -- Content type and data
  type                TEXT NOT NULL CHECK(type IN ('file', 'text')),
  content             TEXT,                                -- FOR TEXT SHARES ONLY
  
  -- File information (only for file shares)
  file_key            TEXT,                                -- R2 object key (files/{id}/name.ext)
  file_name           TEXT,                                -- Original filename
  file_type           TEXT,                                -- MIME type (application/pdf, etc)
  
  -- File size tracking
  file_size           INTEGER,                             -- Compressed size (if applicable)
  file_size_original  INTEGER,                             -- Original size before compression
  
  -- Compression
  is_compressed       INTEGER DEFAULT 0,                   -- Boolean: 1=compressed, 0=not
  
  -- Network access control
  network_private     INTEGER DEFAULT 0,                   -- Boolean: 1=local only, 0=global
  
  -- Timestamps (milliseconds Unix epoch)
  expires_at          INTEGER NOT NULL,                    -- When share expires and can be deleted
  created_at          INTEGER NOT NULL                     -- When share was created
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_room_code ON shares(room_code);
CREATE INDEX IF NOT EXISTS idx_expires_at ON shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_network_private ON shares(network_private);
CREATE INDEX IF NOT EXISTS idx_created_at ON shares(created_at);
CREATE INDEX IF NOT EXISTS idx_type ON shares(type);

-- ============================================================================
-- OPTIONAL TABLE: access_logs (for analytics)
-- ============================================================================
-- Track who accessed what (optional, for future analytics)
-- You can skip this if you don't need analytics
--
CREATE TABLE IF NOT EXISTS access_logs (
  id                  TEXT PRIMARY KEY,                    -- Log entry ID
  share_id            TEXT NOT NULL,                       -- Reference to shares.id
  room_code           TEXT NOT NULL,                       -- Room code for context
  user_ip             TEXT NOT NULL,                       -- User IP address
  is_local_network    INTEGER DEFAULT 0,                   -- Boolean: was user on local network
  accessed_at         INTEGER NOT NULL,                    -- Timestamp in milliseconds
  download_size       INTEGER,                             -- Size of file downloaded (bytes)
  
  FOREIGN KEY (share_id) REFERENCES shares(id)
);

CREATE INDEX IF NOT EXISTS idx_access_share_id ON access_logs(share_id);
CREATE INDEX IF NOT EXISTS idx_access_room_code ON access_logs(room_code);
CREATE INDEX IF NOT EXISTS idx_access_timestamp ON access_logs(accessed_at);

-- ============================================================================
-- LAN DISCOVERY TABLE (for automatic network device discovery)
-- ============================================================================
-- Stores broadcasts from devices on the same WiFi subnet
-- Other devices on the subnet instantly get notified via Supabase Realtime
-- This enables "Nearby on your WiFi" feature without manual room entry
--
CREATE TABLE IF NOT EXISTS local_broadcasts (
  id                  TEXT PRIMARY KEY,                    -- Broadcast ID
  subnet              TEXT NOT NULL,                       -- Network subnet (e.g., "192.168.1")
  room_code           TEXT NOT NULL,                       -- Room code of the share
  share_id            TEXT NOT NULL,                       -- Reference to shares.id
  file_name           TEXT,                                -- File name
  file_size           INTEGER,                             -- Compressed size (bytes)
  file_size_original  INTEGER,                             -- Original size before compression
  file_type           TEXT,                                -- MIME type
  is_compressed       INTEGER DEFAULT 0,                   -- Boolean: 1=compressed, 0=not
  type                TEXT NOT NULL CHECK(type IN ('file', 'text')),
  expires_at          INTEGER NOT NULL,                    -- When to stop showing this broadcast
  created_at          INTEGER NOT NULL                     -- Broadcast timestamp (milliseconds)
);

CREATE INDEX IF NOT EXISTS idx_lan_subnet ON local_broadcasts(subnet);
CREATE INDEX IF NOT EXISTS idx_lan_room_code ON local_broadcasts(room_code);
CREATE INDEX IF NOT EXISTS idx_lan_expires_at ON local_broadcasts(expires_at);
CREATE INDEX IF NOT EXISTS idx_lan_created_at ON local_broadcasts(created_at);
CREATE INDEX IF NOT EXISTS idx_lan_subnet_expires ON local_broadcasts(subnet, expires_at);

-- ============================================================================
-- VIEWS for convenience
-- ============================================================================

-- View: Active shares (not expired)
CREATE VIEW IF NOT EXISTS active_shares AS
SELECT *
FROM shares
WHERE expires_at > CAST((julianday('now') - julianday('1970-01-01')) * 86400000 AS INTEGER);

-- View: Expired shares (for cleanup)
CREATE VIEW IF NOT EXISTS expired_shares AS
SELECT *
FROM shares
WHERE expires_at < CAST((julianday('now') - julianday('1970-01-01')) * 86400000 AS INTEGER);

-- View: Local network only shares
CREATE VIEW IF NOT EXISTS local_network_shares AS
SELECT *
FROM shares
WHERE network_private = 1 AND expires_at > CAST((julianday('now') - julianday('1970-01-01')) * 86400000 AS INTEGER);

-- View: Global shares
CREATE VIEW IF NOT EXISTS global_shares AS
SELECT *
FROM shares
WHERE network_private = 0 AND expires_at > CAST((julianday('now') - julianday('1970-01-01')) * 86400000 AS INTEGER);

-- View: Compression statistics
CREATE VIEW IF NOT EXISTS compression_stats AS
SELECT
  COUNT(*) as total_files,
  SUM(CASE WHEN is_compressed = 1 THEN 1 ELSE 0 END) as compressed_count,
  SUM(CASE WHEN is_compressed = 1 THEN (file_size_original - file_size) ELSE 0 END) as total_space_saved,
  ROUND(AVG(CASE WHEN is_compressed = 1 THEN (100.0 * (file_size_original - file_size) / file_size_original) ELSE 0 END), 2) as avg_compression_ratio
FROM shares
WHERE type = 'file' AND expires_at > CAST((julianday('now') - julianday('1970-01-01')) * 86400000 AS INTEGER);

-- ============================================================================
-- SAMPLE QUERIES FOR TESTING
-- ============================================================================

-- Get a share by room code
-- SELECT * FROM shares WHERE room_code = '123456';

-- Get all active shares
-- SELECT * FROM active_shares ORDER BY created_at DESC;

-- Count total active shares
-- SELECT COUNT(*) as total_shares FROM active_shares;

-- Get compression statistics
-- SELECT * FROM compression_stats;

-- Find all local network only shares
-- SELECT id, room_code, file_name, file_size, created_at FROM local_network_shares;

-- Find expired shares for cleanup
-- SELECT id, room_code FROM expired_shares;

-- Delete expired shares (auto-runs every 30 minutes via cron)
-- DELETE FROM shares WHERE expires_at < CAST((julianday('now') - julianday('1970-01-01')) * 86400000 AS INTEGER);

-- Get storage usage
-- SELECT 
--   COUNT(*) as total_shares,
--   SUM(CASE WHEN type = 'file' THEN file_size ELSE 0 END) as total_file_storage,
--   ROUND(SUM(CASE WHEN type = 'file' THEN file_size ELSE 0 END) / 1024.0 / 1024.0 / 1024.0, 2) as storage_gb
-- FROM active_shares;

-- Get file vs text split
-- SELECT 
--   type,
--   COUNT(*) as count,
--   SUM(file_size) as total_size
-- FROM active_shares
-- GROUP BY type;

-- ============================================================================
