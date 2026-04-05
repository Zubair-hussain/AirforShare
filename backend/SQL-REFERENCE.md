# SQL Schema Files Reference

## 🎯 Architecture Recommendation

> **Summary**: Use **Cloudflare D1** as your primary database. Optionally keep **Supabase as a backup**, but focus development on the **D1 + R2 hybrid approach** for best performance and to stay completely within the **$0/month free tiers**.

### Why D1 is Primary
- ✅ **Native Integration**: Built into Cloudflare Workers, zero latency
- ✅ **Performance**: Queries run on same infrastructure as your code
- ✅ **Cost**: Completely free, included with Workers
- ✅ **Simplicity**: SQLite is lightweight and fast for metadata
- ✅ **Reliability**: Cloudflare's global network ensures uptime

### Why NOT Supabase as Primary
- ❌ Network roundtrips (slower than D1)
- ❌ Rate limiting on free tier
- ❌ PostgreSQL is overkill for metadata
- ❌ Unnecessary complexity

### When to Use Supabase (Backup Only)
- You want redundancy for critical applications
- You want to keep backups in another region
- You plan to migrate to PostgreSQL in the future
- You want write-ahead replication

**Recommendation**: Start with D1 + R2 only. Add Supabase backup later if needed.

---

## Files You Now Have

### 1. **schema.sql** (YOUR MAIN FILE - USE THIS)
**Purpose**: Production schema for Cloudflare D1  
**What it does**: Creates all tables, indexes, and views needed  
**How to use**:
```bash
wrangler d1 execute airforshare-db --file=./schema.sql
```
**Best for**: Getting started quickly, production deployment

---

### 2. **schema-commented.sql** (FOR LEARNING)
**Purpose**: Same as schema.sql but with detailed comments  
**What it does**: Creates tables with full documentation  
**How to use**:
```bash
wrangler d1 execute airforshare-db --file=./schema-commented.sql
```
**Best for**: Understanding database structure, comments explain each table

---

### 3. **schema-supabase.sql** (OPTIONAL - FOR REDUNDANCY)
**Purpose**: PostgreSQL schema for Supabase (optional backup)  
**What it does**: Creates identical structure in Supabase  
**How to use**:
1. Go to Supabase.com → create free account
2. Create project (PostgreSQL)
3. Go to SQL Editor → New Query
4. Paste entire schema-supabase.sql
5. Click Run
6. Add credentials to Cloudflare secrets

**Best for**: Redundancy, backup, analytics, scaling beyond 5GB

---

## Quick Decision Tree

```
┌─────────────────────────────────────────┐
│ Do you want to set up the database?     │
└────────────┬────────────────────────────┘
             │
             ├─ YES, for Cloudflare D1 only
             │  (Free, sufficient, 5GB)
             │  ↓
             │  Use: schema.sql
             │  Run: wrangler d1 execute airforshare-db --file=./schema.sql
             │  Done! ✓
             │
             ├─ YES, and I want to understand it
             │  (Learning, annotations, comments)
             │  ↓
             │  Use: schema-commented.sql
             │  Run: wrangler d1 execute airforshare-db --file=./schema-commented.sql
             │  Now read the comments in schema-commented.sql ✓
             │
             └─ YES, and I want Supabase backup too
                (Production, redundancy, analytics)
                ↓
                1. Set up D1 first (use schema.sql)
                2. Create Supabase account
                3. Use: schema-supabase.sql in Supabase SQL Editor
                4. Set wrangler secrets with Supabase credentials
                Done! ✓ (Dual database setup)
```

---

## File Comparison

| Feature | schema.sql | schema-commented.sql | schema-supabase.sql |
|---------|-----------|----------------------|----------------------|
| Database | Cloudflare D1 | Cloudflare D1 | Supabase (PostgreSQL) |
| Tables | ✓ | ✓ | ✓ |
| Indexes | ✓ | ✓ | ✓ |
| Views | ✓ | ✓ | ✓ |
| Comments | ✗ | ✓✓ | ✓ |
| Helper Functions | ✗ | ✗ | ✓ |
| RLS Setup | ✗ | ✗ | ✓ (commented) |
| Storage Bucket | N/A | N/A | ✓ (manual setup) |
| Pricing | Free 5GB | Free 5GB | Free 500MB |
| Best for | Production | Learning | Redundancy |

---

## Tables Created in All Schemas

### `shares` - Main share storage
Stores all file and text shares with metadata.

**Columns:**
- `id` - Unique identifier
- `room_code` - 6-digit sharing code
- `type` - 'file' or 'text'
- `content` - Text content (for text shares)
- `file_key` - R2 storage path
- `file_name` - Original filename
- `file_type` - MIME type
- `file_size` - Compressed size
- `file_size_original` - Original size
- `is_compressed` - Compression flag
- `network_private` - Local network only flag
- `expires_at` - Expiration timestamp
- `created_at` - Creation timestamp

### `access_logs` - Download tracking (optional)
Tracks who downloaded what and when.

**Columns:**
- `id` - Log entry ID
- `share_id` - Reference to share
- `room_code` - Room code for context
- `user_ip` - Downloader's IP
- `is_local_network` - Was on local network?
- `accessed_at` - Download timestamp
- `download_size` - Bytes downloaded

### Views (for convenience queries)
- `active_shares` - Not expired shares
- `expired_shares` - Ready for cleanup
- `local_network_shares` - Local only shares
- `global_shares` - Global shares
- `compression_stats` - Compression efficiency (Supabase only)

---

## Usage Examples

### Reading from D1

```bash
# Get a share
wrangler d1 execute airforshare-db --command "SELECT * FROM shares WHERE room_code = '123456';"

# Count active shares
wrangler d1 execute airforshare-db --command "SELECT COUNT(*) FROM active_shares;"

# See compression savings
wrangler d1 execute airforshare-db --command "SELECT SUM(file_size_original - file_size) FROM shares WHERE is_compressed = 1;"

# Find local-only shares
wrangler d1 execute airforshare-db --command "SELECT room_code, file_name FROM shares WHERE network_private = 1;"
```

### Reading from Supabase (if you set it up)

Go to Supabase SQL Editor and run:

```sql
-- Active shares count
SELECT COUNT(*) FROM active_shares;

-- Compression stats
SELECT * FROM compression_stats;

-- Get storage usage
SELECT * FROM get_storage_usage();

-- Daily stats
SELECT DATE(created_at_timestamp) as day, COUNT(*) as shares
FROM shares
GROUP BY day
ORDER BY day DESC
LIMIT 7;
```

---

## What Happens When You Run the Schema

✅ Creates `shares` table (stores everything)  
✅ Creates `access_logs` table (optional tracking)  
✅ Creates indexes for fast queries  
✅ Creates views for convenience  
✅ (Supabase only) Creates helper functions  

**Result**: Your database is ready to receive file shares and text!

---

## Next Steps After Setting Up Database

1. ✅ Install backend dependencies: `npm install`
2. ✅ Run development server: `npm run dev`
3. ✅ Test endpoints with curl or frontend
4. ✅ Deploy to Cloudflare: `npm run deploy`

**Then in your frontend**: Update API URLs to point to your backend.

---

## Cost Summary

| Database | Free Tier | Cost |
|----------|-----------|------|
| **Cloudflare D1** | 5GB | $0/month ✓ |
| **Cloudflare R2** | 10GB/month files | $0/month ✓ |
| **Supabase** (optional) | 500MB + 1GB files | $0/month ✓ |
| **TOTAL** | | **$0/month** ✓✓✓ |

---

## Recommended Setup Path

**For Small/Testing:**
```
1. Run schema.sql on D1
2. Start building
3. Upgrade only if needed
Cost: $0/month forever
```

**For Production/Scaling:**
```
1. Run schema.sql on D1
2. Set up schema-supabase.sql for backup
3. Add Supabase file storage
4. Monitor both, keep in sync
Cost: $0/month (Hobby tier)
```

---

## Files You Have

Location: `backend/`

- [schema.sql](./schema.sql) - Main (5 tables)
- [schema-commented.sql](./schema-commented.sql) - Annotated
- [schema-supabase.sql](./schema-supabase.sql) - PostgreSQL version

All ready to use! 🚀
