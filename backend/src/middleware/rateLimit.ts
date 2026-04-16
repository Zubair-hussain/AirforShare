import { Context, Next } from 'hono';
import { Env } from '../types';
import { getIpHash } from '../utils/networkDetection';

// Simple in-memory rate limiter (resets on each Worker cold start)
// For production, use Cloudflare Durable Objects for persistent rate limiting
const uploadCounts = new Map<string, { count: number; resetAt: number }>();

const UPLOAD_LIMIT = 20;       // max requests per IP Hash per window
const WINDOW_MS = 60 * 1000;      // 1 minute window

export async function rateLimitMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  // Hash the IP to protect user privacy
  const ipHash = await getIpHash(c.req.raw.headers, c.env);

  const now = Date.now();
  const record = uploadCounts.get(ipHash);

  if (!record || now > record.resetAt) {
    // New window
    uploadCounts.set(ipHash, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    if (record.count >= UPLOAD_LIMIT) {
      return c.json(
        { error: 'Too many uploads. Please wait before uploading again.' },
        429
      );
    }
    record.count++;
  }

  await next();
}
