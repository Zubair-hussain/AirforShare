# ✈️ AirForShare

> Instant file & text sharing — no signup, no storage, gone in 30 minutes.

Built on **Next.js + Hono.js + Cloudflare Workers + D1 + R2**.  
Cost: **$0/month forever** on free tier.

---

## What It Does

- Drop a file or paste text
- Get a **6-digit room code**
- Anyone with the code can download — no account needed
- Everything auto-deletes after **30 minutes**
- Detects **same WiFi** users for optimized local transfers

---

## Project Structure

```
airforshare/
├── frontend/                  → Next.js app (UI)
│   ├── app/                   → Pages (Next.js App Router)
│   ├── components/            → FileUploader, FileReceiver, Timer
│   └── lib/api.ts             → Backend API client
│
└── backend/                   → Hono.js Cloudflare Worker (API)
    ├── src/
    │   ├── routes/            → upload, download, room, text
    │   ├── middleware/        → CORS, rate limiting
    │   └── utils/             → compression, networkDetection, cleanup
    ├── schema.sql             → D1 database schema
    └── wrangler.toml          → Cloudflare configuration
```

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14, TypeScript |
| Backend | Hono.js, Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| File Storage | Cloudflare R2 |
| Deployment | Vercel (frontend) + Cloudflare (backend) |

---

## Local Development

### Prerequisites
- Node.js 18+
- Cloudflare account (free)
- Wrangler CLI: `npm install -g wrangler`

### 1. Clone & Install

```bash
git clone https://github.com/YOUR-USERNAME/airforshare.git
cd airforshare

# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

### 2. Set Up Backend

```bash
cd backend

# Login to Cloudflare
wrangler login

# Create D1 database
wrangler d1 create airforshare-db
# Copy the database_id into wrangler.toml

# Create R2 bucket
wrangler r2 bucket create airforshare-files

# Run database schema locally
wrangler d1 execute airforshare-db --local --file=./schema.sql

# Start backend
npm run dev
# Running at http://localhost:8787
```

### 3. Set Up Frontend

```bash
cd frontend

# Create environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:8787" > .env.local

# Start frontend
npm run dev
# Running at http://localhost:3000
```

Visit `http://localhost:3000` — everything should work.

---

## Production Deployment

### Step 1 — Deploy Backend (Cloudflare Workers)

```bash
cd backend

# Run schema on remote D1
wrangler d1 execute airforshare-db --file=./schema.sql --remote

# Deploy
wrangler deploy
```

You'll get a URL like:
```
https://airforshare-backend.YOUR-NAME.workers.dev
```

### Step 2 — Update FRONTEND_URL in wrangler.toml

```toml
[vars]
FRONTEND_URL = "https://your-app.vercel.app"  # update after step 3
```

Redeploy: `wrangler deploy`

### Step 3 — Deploy Frontend (Vercel)

```bash
cd frontend
vercel --prod
```

When Vercel asks for environment variables, set:
```
NEXT_PUBLIC_API_URL = https://airforshare-backend.YOUR-NAME.workers.dev
```

### Step 4 — Final Backend Update

Update `FRONTEND_URL` in `wrangler.toml` with your real Vercel URL, then:

```bash
cd backend
wrangler deploy
```

---

## Environment Variables

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8787
```

### Backend (`wrangler.toml` → `[vars]`)
```toml
MAX_FILE_SIZE = "52428800"          # 50MB
COMPRESSION_THRESHOLD = "104857600" # 100MB
ROOM_EXPIRY_MINUTES = "30"
FRONTEND_URL = "http://localhost:3000"
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/upload` | Upload a file (multipart/form-data) |
| `POST` | `/text` | Share text or link (JSON) |
| `GET` | `/room/:code` | Get share metadata |
| `GET` | `/download/:code` | Download file |

---

## Free Tier Limits

| Service | Free Tier | Usage |
|---------|-----------|-------|
| Cloudflare Workers | 100k req/day | ✅ |
| Cloudflare R2 | 10GB storage | ✅ |
| Cloudflare D1 | 5GB, 5M reads/day | ✅ |
| Vercel | 100GB bandwidth/month | ✅ |

**Total: $0/month**

---

## Common Issues

**CORS error in dev?**  
Make sure backend is on port `8787` and frontend on `3000`. Check `FRONTEND_URL` in `wrangler.toml`.

**Blank page via ngrok?**  
Add to `next.config.js`:
```js
const nextConfig = {
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.io"],
};
```

**D1 errors?**  
Re-run the migration:
```bash
wrangler d1 execute airforshare-db --local --file=./schema.sql
```

**File upload failing?**  
Cloudflare Workers free tier has a **10MB** request body limit. Update `MAX_FILE_SIZE` in `wrangler.toml` to `"10485760"` or upgrade to paid plan ($5/month) for 100MB.

---

## Roadmap

- [ ] QR code for room link
- [ ] Password-protected rooms  
- [ ] Multiple file upload
- [ ] Upload progress for large files
- [ ] Analytics dashboard

---

Built by [Zubair Hussain](https://github.com/Zubair-hussain) — Xovato Digital Agency
