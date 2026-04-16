-- ============================================================================
-- AirForShare Database Schema - Supabase (PostgreSQL)
-- ============================================================================
-- This is OPTIONAL and used for redundancy/backup only
-- Supabase free tier: 500MB database + 1GB file storage
-- 
-- Instructions:
-- 1. Create account at https://supabase.com (free)
-- 2. Create new project (PostgreSQL)
-- 3. Go to SQL Editor in Supabase dashboard
-- 4. Copy this entire file and run it
-- 5. Copy your URL and anon key from Settings → API Keys
-- 6. Set environment secrets:
--    wrangler secret put SUPABASE_URL
--    wrangler secret put SUPABASE_KEY
-- ============================================================================

-- Enable UUID extension (needed for primary keys)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- MAIN TABLE: shares
-- ============================================================================
CREATE TABLE IF NOT EXISTS shares (
  -- Unique identifiers
  id                  TEXT PRIMARY KEY,
  room_code           TEXT UNIQUE NOT NULL,
  
  -- Content type and data
  type                TEXT NOT NULL CHECK(type IN ('file', 'text')),
  content             TEXT,
  
  -- File information
  file_name           TEXT,
  file_type           TEXT,
  file_size           BIGINT,
  file_size_original  BIGINT,
  
  -- Compression
  is_compressed       BOOLEAN DEFAULT false,
  
  -- Network grouping
  ip_hash             TEXT NOT NULL,
  room_id             TEXT DEFAULT 'public',
  
  -- Timestamps (UTC)
  expires_at          BIGINT NOT NULL,
  created_at          BIGINT NOT NULL,
  created_at_timestamp TIMESTAMP DEFAULT now()
);

-- Indexes
CREATE INDEX idx_room_code ON shares(room_code);
CREATE INDEX idx_expires_at ON shares(expires_at);
CREATE INDEX idx_ip_hash ON shares(ip_hash);
CREATE INDEX idx_room_id ON shares(room_id);
CREATE INDEX idx_created_at ON shares(created_at);
CREATE INDEX idx_type ON shares(type);

-- ============================================================================
-- ACCESS LOGS TABLE (OPTIONAL - for analytics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS access_logs (
  id                  TEXT PRIMARY KEY,
  share_id            TEXT NOT NULL REFERENCES shares(id) ON DELETE CASCADE,
  room_code           TEXT NOT NULL,
  user_ip             TEXT NOT NULL,
  is_local_network    BOOLEAN DEFAULT false,
  accessed_at         BIGINT NOT NULL,
  download_size       BIGINT,
  created_at_timestamp TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_access_share_id ON access_logs(share_id);
CREATE INDEX idx_access_room_code ON access_logs(room_code);
CREATE INDEX idx_access_timestamp ON access_logs(accessed_at);

-- ============================================================================
-- LAN DISCOVERY TABLE (for automatic device discovery on local networks)
-- ============================================================================
-- Stores broadcasts from devices on the same WiFi subnet
-- Used by Supabase Realtime to alert other devices on the network
CREATE TABLE IF NOT EXISTS local_broadcasts (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  
  -- Network subnet (e.g., "192.168.1")
  subnet              TEXT NOT NULL,
  
  -- Share information
  room_code           TEXT NOT NULL,
  share_id            TEXT NOT NULL,
  
  -- File details
  file_name           TEXT,
  file_size           BIGINT,
  file_size_original  BIGINT,
  file_type           TEXT,
  is_compressed       BOOLEAN DEFAULT false,
  
  -- Share type ('file' or 'text')
  type                TEXT NOT NULL CHECK(type IN ('file', 'text')),
  
  -- Expiry
  expires_at          BIGINT NOT NULL,
  
  -- Timestamps
  created_at          BIGINT NOT NULL,
  created_at_timestamp TIMESTAMP DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX idx_lan_subnet ON local_broadcasts(subnet);
CREATE INDEX idx_lan_room_code ON local_broadcasts(room_code);
CREATE INDEX idx_lan_expires_at ON local_broadcasts(expires_at);
CREATE INDEX idx_lan_created_at ON local_broadcasts(created_at);
CREATE INDEX idx_lan_subnet_expires ON local_broadcasts(subnet, expires_at);

-- ============================================================================
-- STORAGE BUCKET for files (optional)
-- ============================================================================
-- Do NOT run this in SQL Editor - instead:
-- 1. Go to Storage in Supabase dashboard
-- 2. Click "Create new bucket"
-- 3. Name it: "airforshare-files"
-- 4. Make it PUBLIC
-- 5. Enable Viruss scanning if desired (free with Supabase)
--
-- Then you can use: uploadToSupabaseStorage() in the backend
-- ============================================================================

-- ============================================================================
-- VIEWS for convenience
-- ============================================================================

-- Active shares
CREATE VIEW active_shares AS
SELECT *
FROM shares
WHERE expires_at > EXTRACT(EPOCH FROM now())::BIGINT * 1000;

-- Expired shares
CREATE VIEW expired_shares AS
SELECT *
FROM shares
WHERE expires_at <= EXTRACT(EPOCH FROM now())::BIGINT * 1000;

-- Local network shares
CREATE VIEW local_network_shares AS
SELECT *
FROM shares
WHERE network_private = true 
  AND expires_at > EXTRACT(EPOCH FROM now())::BIGINT * 1000;

-- Global shares
CREATE VIEW global_shares AS
SELECT *
FROM shares
WHERE network_private = false 
  AND expires_at > EXTRACT(EPOCH FROM now())::BIGINT * 1000;

-- Compression stats
CREATE VIEW compression_stats AS
SELECT
  COUNT(*) as total_files,
  SUM(CASE WHEN is_compressed THEN 1 ELSE 0 END) as compressed_count,
  SUM(CASE WHEN is_compressed THEN (file_size_original - file_size) ELSE 0 END) as total_space_saved,
  ROUND(AVG(CASE WHEN is_compressed THEN (100.0 * (file_size_original - file_size) / file_size_original) ELSE 0 END)::numeric, 2) as avg_compression_ratio
FROM shares
WHERE type = 'file' 
  AND expires_at > EXTRACT(EPOCH FROM now())::BIGINT * 1000;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get current timestamp in milliseconds
CREATE OR REPLACE FUNCTION current_timestamp_ms()
RETURNS BIGINT AS $$
BEGIN
  RETURN EXTRACT(EPOCH FROM now())::BIGINT * 1000;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate storage usage
CREATE OR REPLACE FUNCTION get_storage_usage()
RETURNS TABLE(
  total_shares BIGINT,
  total_file_storage BIGINT,
  storage_gb NUMERIC,
  compressed_shares BIGINT,
  space_saved BIGINT
) AS $$
SELECT
  COUNT(*) as total_shares,
  COALESCE(SUM(CASE WHEN type = 'file' THEN file_size ELSE 0 END), 0) as total_file_storage,
  ROUND(COALESCE(SUM(CASE WHEN type = 'file' THEN file_size ELSE 0 END), 0) / 1024.0 / 1024.0 / 1024.0, 2)::NUMERIC as storage_gb,
  SUM(CASE WHEN is_compressed THEN 1 ELSE 0 END) as compressed_shares,
  COALESCE(SUM(CASE WHEN is_compressed THEN (file_size_original - file_size) ELSE 0 END), 0) as space_saved
FROM active_shares;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- ROW LEVEL SECURITY (OPTIONAL - for production)
-- ============================================================================
-- Enable RLS for security (recommended for production)
--
-- ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable all access for now" ON shares FOR ALL USING (true);
-- 
-- ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable all access for now" ON access_logs FOR ALL USING (true);
--
-- For production, you might restrict based on room_code or other factors
-- ============================================================================

-- ============================================================================
-- SAMPLE QUERIES FOR TESTING
-- ============================================================================

-- Get a share by room code
-- SELECT * FROM shares WHERE room_code = '123456';

-- Get all active file shares
-- SELECT id, room_code, file_name, file_size, is_compressed FROM active_shares WHERE type = 'file' ORDER BY created_at DESC;

-- Count active shares
-- SELECT COUNT(*) as total_active FROM active_shares;

-- Get compression statistics
-- SELECT * FROM compression_stats;

-- Get storage usage
-- SELECT * FROM get_storage_usage();

-- Find local network shares
-- SELECT id, room_code, file_name FROM local_network_shares;

-- Find expired shares for cleanup
-- SELECT id, room_code FROM expired_shares;

-- Delete expired shares (cleanup)
-- DELETE FROM shares WHERE expires_at <= EXTRACT(EPOCH FROM now())::BIGINT * 1000;

-- Get file vs text split
-- SELECT 
--   type,
--   COUNT(*) as count,
--   COALESCE(SUM(file_size), 0) as total_size
-- FROM active_shares
-- GROUP BY type;

-- Get compression efficiency
-- SELECT
--   COUNT(*) as total_compressed,
--   ROUND(AVG((file_size_original - file_size)::float / file_size_original * 100), 2) as avg_compression_percent,
--   ROUND(SUM(file_size_original - file_size) / 1024.0 / 1024.0, 2) as total_saved_mb
-- FROM shares
-- WHERE is_compressed AND expires_at > EXTRACT(EPOCH FROM now())::BIGINT * 1000;

-- ============================================================================
