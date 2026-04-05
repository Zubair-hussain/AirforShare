# AirForShare - Backend Deployment & Setup Guide

## Quick Start

### Prerequisites
- Node.js 18+ installed
- Cloudflare Workers account (free tier available)
- Supabase account (optional, for redundancy)
- npm or yarn package manager

### 1. Install Dependencies

```bash
cd backend
npm install
# or
yarn install
```

This will install:
- **hono**: Fast, lightweight web framework
- **@supabase/supabase-js**: Supabase client library
- **pako**: Gzip compression library
- **typescript**: Static typing support
- **wrangler**: Cloudflare Workers CLI

### 2. Update Database Schema

Run the schema migration to add new columns for compression and network features:

```bash
wrangler d1 execute airforshare-db --file=./schema.sql
```

This creates/updates:
- `file_size_original` - original file size before compression
- `is_compressed` - flag indicating if file is compressed
- `network_private` - flag for network-restricted shares
- New indexes for performance

### 3. Configure Environment Variables

**For Development (Wrangler Local):**

Create `.env.local`:
```bash
cp .env.example .env.local
```

Edit `.env.local` and set:
```env
MAX_FILE_SIZE=52428800
COMPRESSION_THRESHOLD=104857600
ROOM_EXPIRY_MINUTES=30
FRONTEND_URL=http://localhost:3000
# Leave Supabase empty for development if not needed
```

**For Production (Cloudflare Workers):**

Set secrets via Wrangler CLI:
```bash
wrangler secret put SUPABASE_URL
# Paste your Supabase URL

wrangler secret put SUPABASE_KEY
# Paste your Supabase anon key
```

### 4. Supabase Setup (Optional)

If you want to use Supabase for redundancy:

1. Create a Supabase project at https://supabase.com
2. Go to Settings → API Keys
3. Copy **Project URL** and **anon key**
4. Run the setup script:

```sql
-- Create shares table in Supabase SQL Editor
CREATE TABLE shares (
  id TEXT PRIMARY KEY,
  room_code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('file', 'text')),
  content TEXT,
  file_name TEXT,
  file_size INTEGER,
  file_size_original INTEGER,
  file_type TEXT,
  is_compressed BOOLEAN DEFAULT false,
  network_private BOOLEAN DEFAULT false,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  created_at_timestamp TIMESTAMP DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_room_code ON shares(room_code);
CREATE INDEX idx_expires_at ON shares(expires_at);
CREATE INDEX idx_network_private ON shares(network_private);

-- Create storage bucket
-- Go to Storage → Create new bucket → name: "airforshare-files"
-- Make it public
```

5. Set environment secrets:
```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_KEY
```

### 5. Development Testing

Run the development server:

```bash
npm run dev
# or
wrangler dev
```

This starts a local server at `http://localhost:8787`

**Test endpoints:**

```bash
# Upload a file
curl -X POST http://localhost:8787/upload \
  -F "file=@yourfile.pdf"

# Get room info
curl http://localhost:8787/room/123456

# Download file
curl http://localhost:8787/download/123456 -O

# Share text
curl -X POST http://localhost:8787/text \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello world!"}'

# Verify access
curl -X POST http://localhost:8787/room/verify-access \
  -H "Content-Type: application/json" \
  -d '{"roomCode":"123456"}'
```

### 6. Deploy to Production

Deploy to Cloudflare Workers:

```bash
npm run deploy
# or
wrangler deploy
```

This will:
1. Build TypeScript code
2. Deploy to Cloudflare Workers
3. Set up D1 database bindings
4. Set up R2 storage bindings
5. Configure cron triggers

**Verify deployment:**

```bash
# Check your worker logs
wrangler tail

# Test a real request
curl https://your-worker-name.workers.dev/
```

### 7. Configure Custom Domain (Optional)

In Cloudflare dashboard:
1. Go to Workers → YourWorker → Triggers
2. Click "Add custom domain"
3. Enter your domain (e.g., api.airforshare.com)
4. Configure DNS records

### 8. Enable Cloudflare Security Features

In Cloudflare dashboard:

**DDoS Protection:**
- Security → DDoS → Enable DDoS protection (free tier)

**Rate Limiting:**
- Security → Rate Limiting
- Create rule: `/upload` - 100 req/min per IP
- Create rule: `/download` - 500 req/min per IP
- Create rule: `/text` - 100 req/min per IP

**WAF (Web Application Firewall):**
- Security → WAF
- Enable "Managed Ruleset"
- Add custom rules if needed

**HTTPS:**
- SSL/TLS → Overview → Flexible (minimum)
- Or Full if you have valid certificate

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│              http://localhost:3000                       │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ HTTPS/CORS
                       ▼
┌─────────────────────────────────────────────────────────┐
│            Cloudflare Workers (Backend)                 │
│         ├─ /upload (with compression)                   │
│         ├─ /download (with decompression)               │
│         ├─ /room (with network detection)               │
│         ├─ /text (with network detection)               │
│         └─ /health                                      │
└──┬──────────────┬─────────────────────┬─────────────────┘
   │              │                     │
   ▼              ▼                     ▼
┌─────────┐  ┌────────────┐  ┌──────────────────┐
│ D1 DB   │  │ R2 Storage │  │ Supabase (opt)   │
│ Metadata│  │ File data  │  │ ├─ DB (backup)   │
│         │  │ Logs       │  │ └─ Storage (opt) │
└─────────┘  └────────────┘  └──────────────────┘
```

## Performance Tuning

### Compression Settings

Increase threshold for less compression:
```toml
COMPRESSION_THRESHOLD = "209715200"  # 200MB instead of 100MB
```

Or decrease for more compression:
```toml
COMPRESSION_THRESHOLD = "54857600"   # 50MB
```

### File Size Limits

Increase for larger files (Cloudflare limit is 100MB for streaming):
```toml
MAX_FILE_SIZE = "104857600"  # 100MB
```

### Expiry Time

Make shares last longer:
```toml
ROOM_EXPIRY_MINUTES = "120"  # 2 hours
```

## Monitoring & Logging

### View Worker Logs

```bash
wrangler tail --format pretty
```

### Check Database Usage

```bash
# View D1 database stats
wrangler d1 info airforshare-db

# Query shares table
wrangler d1 execute airforshare-db --command "SELECT COUNT(*) as total FROM shares;"

# Check expired shares
wrangler d1 execute airforshare-db --command "SELECT COUNT(*) FROM shares WHERE expires_at < datetime('now');"
```

### Monitor R2 Storage

In Cloudflare dashboard:
- R2 → Buckets → airforshare-files
- View total storage used
- Monitor request counts

## Troubleshooting

### Issue: Compression not working
**Solution**: Check file size > COMPRESSION_THRESHOLD
```bash
# Verify setting
wrangler env list
```

### Issue: Supabase connection failing
**Solution**: Fallback to D1 is automatic. Check secrets:
```bash
wrangler secret list
# Verify SUPABASE_URL and SUPABASE_KEY are set
```

### Issue: Network detection not working
**Solution**: Verify Cloudflare is forwarding headers. Check logs:
```bash
wrangler tail
# Look for "CF-Connecting-IP" header
```

### Issue: File download fails
**Solution**: Check if file expired. Clean up:
```bash
wrangler d1 execute airforshare-db --command "DELETE FROM shares WHERE expires_at < datetime('now');"
```

## Maintenance Tasks

### Weekly
```bash
# Check logs for errors
wrangler tail --format json | grep error
```

### Monthly
```bash
# Clean up old database records
wrangler d1 execute airforshare-db --command "DELETE FROM shares WHERE expires_at < datetime('now');"

# Check storage usage
wrangler r2 bucket list
```

### As Needed
```bash
# Update dependencies
npm update

# Deploy updates
npm run deploy

# Run schema migrations
wrangler d1 execute airforshare-db --file=./schema.sql
```

## Security Checklist

- [ ] HTTPS enabled on custom domain
- [ ] Cloudflare DDoS protection enabled
- [ ] Rate limiting configured
- [ ] CORS properly configured for your domain
- [ ] Environment secrets set (not in code)
- [ ] Database backups enabled (Supabase)
- [ ] R2 bucket versioning enabled (optional)
- [ ] Logs retention configured
- [ ] Automatic cleanup cron job running

## Cost Estimation (Free/Paid Tiers)

**Free tier limits:**
- Cloudflare Workers: 100,000 requests/day
- D1: 5 GB storage (free tier)
- R2: 10 GB/month free
- Billable: $0.15 per million requests beyond free tier

**Supabase (optional):**
- Free tier: 500 MB database, 1 GB file storage
- Billable: $25/month + usage

For a small startup, free tiers can handle significant traffic. Monitor usage via dashboards.

## Next Steps

1. Test file uploads with various sizes
2. Verify compression is working (check response)
3. Test network detection on local server
4. Configure frontend to use new endpoints
5. Set up monitoring and alerts
6. Plan capacity scaling strategy

## Support & Documentation

- Questions? Check [FEATURES.md](./FEATURES.md)
- API docs? See API Endpoints section in FEATURES.md
- Issues? Check Troubleshooting section above
- Wrangler docs: https://developers.cloudflare.com/workers/
- Supabase docs: https://supabase.com/docs/
