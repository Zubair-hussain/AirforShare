import { Hono } from 'hono';
import { Env } from './types';
import { corsMiddleware } from './middleware/cors';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { upload } from './routes/upload';
import { download } from './routes/download';
import { room } from './routes/room';
import { text } from './routes/text';
import { cleanupExpiredShares } from './utils/cleanup';

const app = new Hono<{ Bindings: Env }>();

// ── Global Middleware ──────────────────────────────────────────────
app.use('*', corsMiddleware);

// ── Health Check ───────────────────────────────────────────────────
app.get('/', (c) => c.json({ status: 'ok', service: 'airforshare-api' }));

// ── Routes ─────────────────────────────────────────────────────────
// File upload (rate limited)
app.use('/upload', rateLimitMiddleware);
app.route('/upload', upload);

// Text share (rate limited)
app.use('/text', rateLimitMiddleware);
app.route('/text', text);

// Room info lookup
app.route('/room', room);

// File download
app.route('/download', download);

// ── 404 Fallback ───────────────────────────────────────────────────
app.notFound((c) => c.json({ error: 'Not found' }, 404));

app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

// ── Cloudflare Cron Trigger ────────────────────────────────────────
// Fires every 30 minutes per wrangler.toml cron config
export default {
  fetch: app.fetch,

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(cleanupExpiredShares(env));
  },
};
