# Free Database Setup for AirForShare

## 🎯 Architecture Recommendation

> **Use Cloudflare D1 as your primary database. Keep Supabase schema as optional backup only.**

### Recommended Setup: **D1 + R2** (Fastest, Cheapest, Best Performance)

```
┌──────────────────────────────────────────────────────────┐
│           AirForShare Recommended Architecture            │
└──────────────────────────────────────────────────────────┘

┌─────────────┐       ┌─────────────┐       ┌──────────────┐
│   Frontend  │───→   │ Cloudflare  │───→   │   R2 Files   │
│  (Next.js)  │       │  Workers    │       │   Storage    │
└─────────────┘       │  (Backend)  │       └──────────────┘
                      │             │
                      │   D1 DB ◄───┘       ← Primary DB
                      │ (Metadata) │        ← Same region
                      │             │        ← Zero latency
                      └─────────────┘
                            ▲
                            │
                     ┌──────┴──────┐
                     │  Supabase   │
                     │ (Optional)  │
                     │   Backup    │
                     └─────────────┘
```

### Why This Setup?

✅ **D1 as Primary**
- Native Cloudflare integration (zero latency)
- Faster queries (same data center as your code)
- Free tier adequate for metadata storage
- 5GB = ~10 million shares possible
- Simple, reliable, proven

✅ **R2 for Files**
- Store actual files (not metadata)
- Global CDN edge locations
- Free 10GB/month bandwidth
- Perfect for file distribution

✅ **Supabase as Optional Backup** (Skip if not needed)
- Disaster recovery only
- Not for primary queries (adds latency)
- Only set up if you need true redundancy
- Can always be added later

### Cost
```
D1 Metadata DB:  $0/month (5GB free)
R2 File Storage: $0/month (10GB/month free)
Supabase Backup: $0/month (optional)
─────────────────────────
TOTAL:           $0/month forever ✓
```

### Performance Baseline (D1 + R2)
- Upload: < 500ms (including compression)
- Download: < 200ms + network latency
- Room lookup: < 10ms
- Compression: < 300ms per 100MB
- **Global latency**: 30-100ms via Cloudflare edge

---

## Overview

We use **two free databases** (one required, one optional):

1. **Cloudflare D1** (PRIMARY) - Free, SQLite, included with Workers
2. **Supabase** (OPTIONAL) - Free tier, PostgreSQL, for redundancy/backup

---

## 🟦 Primary: Cloudflare D1 (FREE - 5GB)

**Why D1?**
- ✅ Free tier included with Cloudflare Workers
- ✅ Already configured in your `wrangler.toml`
- ✅ 5GB storage (more than enough for metadata)
- ✅ No costs even with heavy usage
- ✅ SQLite - simple, reliable, fast

### Setup Steps

#### Step 1: Create D1 Database

```bash
cd backend
wrangler d1 create airforshare-db
```

You'll see output like:
```
✅ Created database airforshare-db
🔌 Binding: DB
📝 Database ID: 05d99616-5f06-41f7-b898-f0b454d5b08f
```

Copy the **database ID** - paste it in `wrangler.toml` if not already there.

#### Step 2: Run the Schema

Update the D1 database with our schema:

**Option A: Using the existing schema.sql (simplest)**
```bash
wrangler d1 execute airforshare-db --file=./schema.sql
```

**Option B: Using the commented schema (if you want to understand what each table does)**
```bash
wrangler d1 execute airforshare-db --file=./schema-commented.sql
```

The script will:
- ✅ Create `shares` table (stores files & text)
- ✅ Create `access_logs` table (optional analytics)
- ✅ Create indexes for performance
- ✅ Create views for convenience queries

#### Step 3: Verify Setup

Check that tables were created:

```bash
wrangler d1 execute airforshare-db --command "SELECT name FROM sqlite_master WHERE type='table';"
```

You should see:
```
name
----
shares
access_logs
```

### Database Structure

#### `shares` Table - Stores all shares (files and text)

| Column | Type | Purpose |
|--------|------|---------|
| `id` | TEXT | Unique share ID |
| `room_code` | TEXT | 6-digit code (e.g., 123456) |
| `type` | TEXT | 'file' or 'text' |
| `content` | TEXT | Text content (only for text shares) |
| `file_key` | TEXT | R2 storage path |
| `file_name` | TEXT | Original filename |
| `file_type` | TEXT | MIME type (e.g., 'application/pdf') |
| `file_size` | INTEGER | Size after compression |
| `file_size_original` | INTEGER | Original size before compression |
| `is_compressed` | INTEGER | 1 = compressed, 0 = not |
| `network_private` | INTEGER | 1 = local only, 0 = global |
| `expires_at` | INTEGER | Unix timestamp when to delete |
| `created_at` | INTEGER | Unix timestamp when created |

#### `access_logs` Table (Optional) - Track downloads

| Column | Type | Purpose |
|--------|------|---------|
| `id` | TEXT | Log entry ID |
| `share_id` | TEXT | Reference to shares.id |
| `room_code` | TEXT | Room code for context |
| `user_ip` | TEXT | User's IP address |
| `is_local_network` | INTEGER | 1 = local, 0 = remote |
| `accessed_at` | INTEGER | Timestamp of download |
| `download_size` | INTEGER | Bytes downloaded |

### Common Queries

```bash
# Count total active shares
wrangler d1 execute airforshare-db --command "SELECT COUNT(*) FROM shares WHERE expires_at > CAST((julianday('now') - julianday('1970-01-01')) * 86400000 AS INTEGER);"

# Get a specific share
wrangler d1 execute airforshare-db --command "SELECT * FROM shares WHERE room_code = '123456';"

# Find compressed files
wrangler d1 execute airforshare-db --command "SELECT room_code, file_name, file_size, file_size_original FROM shares WHERE is_compressed = 1;"

# Check local-only shares
wrangler d1 execute airforshare-db --command "SELECT room_code, file_name FROM shares WHERE network_private = 1;"

# Calculate compression savings
wrangler d1 execute airforshare-db --command "SELECT SUM(file_size_original - file_size) as space_saved_bytes FROM shares WHERE is_compressed = 1;"

# Auto-cleanup expired shares (this runs every 30 min via cron)
wrangler d1 execute airforshare-db --command "DELETE FROM shares WHERE expires_at < CAST((julianday('now') - julianday('1970-01-01')) * 86400000 AS INTEGER);"
```

### Pricing
- **Free tier**: Unlimited queries, 5GB storage
- **Cost**: $0/month
- **When you outgrow it**: Supabase becomes your backup (no action needed)

---

## 🟩 Optional: Supabase (FREE - 500MB + 1GB files)

**Why Supabase?**
- ✅ Free tier with good limits
- ✅ Real PostgreSQL (different from SQLite)
- ✅ Can be backup storage
- ✅ Built-in file storage with CDN
- ✅ PostgreSQL is industry standard (scales to enterprise)

**When to use?**
- You want database redundancy
- You want file storage with CDN
- You plan to scale beyond 5GB
- You want better analytics capabilities

### Setup Steps

#### Step 1: Create Free Supabase Account

1. Go to https://supabase.com
2. Click "Start Your Project" (free)
3. Sign up with email
4. Create new project
   - Organization: your choice
   - Project name: "airforshare"
   - Password: strong password
   - Region: closest to you
   - Plan: Free

Wait ~2 minutes for project to initialize.

#### Step 2: Run the Schema in Supabase

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Copy the entire content of [schema-supabase.sql](./schema-supabase.sql)
4. Paste it in the SQL editor
5. Click **Run**

The script will create:
- ✅ `shares` table
- ✅ `access_logs` table  
- ✅ Indexes for performance
- ✅ Views for convenience
- ✅ Helper functions for analytics

#### Step 3: Get API Credentials

1. Go to **Settings → API**
2. You'll see:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon (public)** key: starts with `eyJ...`

Copy both of these.

#### Step 4: Set Environment Secrets

```bash
cd backend
wrangler secret put SUPABASE_URL
# Paste: https://xxxxx.supabase.co
# Press Enter

wrangler secret put SUPABASE_KEY
# Paste: eyJ...
# Press Enter
```

Verify they're set:
```bash
wrangler secret list
```

#### Step 5: (Optional) Create Storage Bucket

For file storage with CDN:

1. In Supabase dashboard, go to **Storage**
2. Click **Create new bucket**
3. Name: `airforshare-files`
4. Make Public: toggle ON
5. Click **Create bucket**

Now your backend can upload files to Supabase too.

### Database Structure (Same as D1)

All tables are identical to D1 for easy sync.

### Sample Queries in Supabase

In Supabase SQL Editor:

```sql
-- Count active shares
SELECT COUNT(*) FROM active_shares;

-- Get compression stats
SELECT * FROM compression_stats;

-- Get storage usage
SELECT * FROM get_storage_usage();

-- Find newly created shares (last hour)
SELECT room_code, file_name, created_at_timestamp
FROM shares
WHERE created_at_timestamp > now() - interval '1 hour'
ORDER BY created_at_timestamp DESC;

-- Auto-cleanup (backend does this, but you can manually run)
DELETE FROM shares 
WHERE expires_at < EXTRACT(EPOCH FROM now())::BIGINT * 1000;
```

### Pricing
- **Free tier**: 500MB database + 1GB file storage/month
- **Cost**: $0/month for hobby projects
- **Paid**: $25/month pro tier if you grow

---

## 📊 Which Database to Use?

### ✅ RECOMMENDED: Use Cloudflare D1 (Primary)
- **Status**: Required for production
- **Performance**: Fastest (native Cloudflare integration)
- **Setup**: 5 minutes (just run schema.sql)
- **Cost**: $0/month
- **Storage**: 5GB (sufficient for metadata)

**Why D1?**
- 🚀 Zero latency (same infrastructure as Workers)
- 💰 Included free with Cloudflare Workers
- ⚡ SQLite is fast for metadata queries
- 🔒 Automatic backups by Cloudflare
- 📊 Same region as your backend

### 🔲 OPTIONAL: Use Supabase (Backup Only)
- **Status**: Optional for redundancy/disaster recovery
- **Performance**: Good (but +50-100ms latency)
- **Setup**: 10 minutes (if you decide to)
- **Cost**: $0/month (free tier)
- **Storage**: 500MB (duplicate of D1)

**Why Supabase as Backup Only?**
- ✓ Geographic redundancy
- ✓ PostgreSQL if you need advanced features later
- ✓ Free tier is generous
- ✓ Easy to add later without breaking D1

**When to Add Supabase:**
- You want true disaster recovery
- You need geographic redundancy
- You plan enterprise features later
- You want analytics/reporting capabilities

**When NOT to Use Supabase:**
- Just starting out (D1 sufficient)
- Want maximum performance (D1 is faster)
- Want to keep infrastructure simple
- Don't need backup (Cloudflare handles this)

### ❌ NOT RECOMMENDED as Primary
- Supabase as primary (unnecessary latency)
- Multiple databases for same data (sync complexity)
- Mixing D1 + Supabase without clear role separation

---

## Strategy Recommendation

### Phase 1: MVP (Week 1) - D1 Only
```
Start with:
✓ Cloudflare D1 (primary)
✓ Cloudflare R2 (files)
✓ Skip Supabase

Time to launch: 2-3 hours
Cost: $0/month
Performance: Excellent
Complexity: Minimal
```

**Steps:**
1. Run schema.sql on D1
2. Deploy backend
3. Test everything
4. Go live

### Phase 2: Scale (Month 2+) - Consider Supabase
```
Add if you need:
✓ Geographic redundancy
✓ Advanced analytics
✓ PostgreSQL-specific features
✓ Disaster recovery

Time to add: 30 minutes
Cost: Still $0/month (free tier)
Performance: Slight increase in latency
Complexity: Moderate (dual-write)
```

**Steps:**
1. Create Supabase account
2. Run schema-supabase.sql
3. Configure backup sync
4. Monitor both databases
5. Failover procedures

### Phase 3: Enterprise (Year 2+) - Migration
```
If you outgrow free tiers:
✓ Upgrade D1 to paid
✓ OR upgrade Supabase Pro
✓ OR switch to owned PostgreSQL
```

---

## 🔄 How They Work Together

```
┌─────────────────┐
│ Upload File     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ Check if > 100MB            │
│ Compress if needed          │
└────────┬────────────────────┘
         │
         ├─→ Upload to R2 ─────────────────┐
         │                                 │
         ├─→ Save metadata to D1 ◄─────────┤ Required
         │   (room_code, sizes, etc)       │
         │                                 ▼
         ├─→ Save metadata to Supabase ◄── Optional (if configured)
         │   (for redundancy/backup)       │
         │                                 │
         └──────────────────────────────────┘

If Supabase fails: D1 still works ✓
If D1 fails: Supabase can serve as backup
Both working: Full redundancy + analytics
```

---

## 💾 Storage Breakdown

### D1 (Cloudflare)
- **What's stored**: Metadata only (room codes, file names, timestamps, compression info)
- **Storage per share**: ~500 bytes
- **5GB limit means**: ~10 million shares possible
- **Your usage**: Room to scale massively

### R2 (Cloudflare)  
- **What's stored**: Actual file data
- **Free tier**: 10GB/month (after compression!)
- **Your usage**: With 50MB limit per file and compression, very efficient

### Supabase (Optional)
- **What's stored**: Duplicate of D1 metadata + optional files
- **500MB limit means**: Same as D1, room for ~1 million shares
- **Your usage**: Overkill for most cases, but great for analytics

---

## 🚀 Quick Start (Copy-Paste)

### Just Want D1 (Minimum Setup)

```bash
# 1. Create database
wrangler d1 create airforshare-db

# 2. Copy database ID to wrangler.toml if needed

# 3. Create tables
wrangler d1 execute airforshare-db --file=./schema.sql

# 4. Verify
wrangler d1 execute airforshare-db --command "SELECT COUNT(*) FROM shares WHERE 1=0;"

# Done! ✓
```

### Want D1 + Supabase (Redundancy)

```bash
# Follow D1 steps above, then:

# 5. Create Supabase account at https://supabase.com

# 6. In Supabase SQL Editor, paste schema-supabase.sql and run

# 7. Set secrets
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_KEY

# Done! ✓
```

---

## 🔍 Monitoring Your Database

### Check D1 Usage
```bash
# See database info
wrangler d1 info airforshare-db

# View storage usage (bytes)
wrangler d1 execute airforshare-db --command "SELECT SUM(file_size) as total_bytes FROM shares;"
```

### Check Supabase Usage

In Supabase Dashboard:
- **Database** → Shows current usage (metrics)
- **Storage** → Shows file storage used
- **SQL Editor** → Run queries anytime

### Monitoring in Production

```bash
# Get daily statistics
wrangler d1 execute airforshare-db --command "
  SELECT 
    DATE(datetime(created_at/1000, 'unixepoch')) as day,
    COUNT(*) as shares_created,
    SUM(CASE WHEN type='file' THEN file_size ELSE 0 END) as file_storage_bytes
  FROM shares
  GROUP BY day
  ORDER BY day DESC
  LIMIT 7;
"
```

---

## ⚠️ Important Notes

1. **Auto-cleanup**: Expired shares are automatically deleted every 30 minutes via Cloudflare cron
2. **Timestamps**: All timestamps are in milliseconds (JavaScript format)
3. **Room codes**: 6-digit numbers (unique, required for sharing)
4. **Compression**: Files ≥100MB are auto-compressed (configurable)
5. **Network private**: Local-only files don't need D1 to work, they're discovered via IP
6. **Backup**: Supabase is optional but recommended for production

---

## 🆘 Troubleshooting

### D1 Creation Failed
```bash
# Check account setup
wrangler whoami

# Try again with explicit region
wrangler d1 create airforshare-db --region us
```

### Schema Won't Run
```bash
# Check syntax (looks for SQL errors)
# Try running a simple query first
wrangler d1 execute airforshare-db --command "SELECT 1;"

# If that works, schema issue is specific - check line numbers in error
```

### Supabase Connection Not Working
```bash
# Check credentials are correct
wrangler secret list

# Verify in backend logs
wrangler tail --format pretty
```

### Out of Storage
D1 doesn't refuse queries, but:
- Upgrade to paid plan (D1 gets bigger quota)
- Or, manually cleanup old shares: `DELETE FROM expired_shares;`
- Or, migrate to Supabase Pro ($25/month)

---

## 📚 Next Steps

1. **Now**: Run D1 schema setup (5 minutes)
2. **Soon**: Run backend with `npm run dev` and test uploads
3. **Later**: Set up Supabase if you want redundancy
4. **Production**: Deploy with `wrangler deploy` and monitor

**Questions?** Check FEATURES.md or DEPLOYMENT.md for more details.
