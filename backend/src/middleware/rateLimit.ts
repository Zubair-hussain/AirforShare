import { Context, Next } from 'hono';
import { Env } from '../types';

// Simple in-memory rate limiter (resets on each Worker cold start)
// For production, use Cloudflare Durable Objects for persistent rate limiting
const uploadCounts = new Map<string, { count: number; resetAt: number }>();

const UPLOAD_LIMIT = 10;       // max uploads per IP per window
const WINDOW_MS = 60 * 60 * 1000; // 1 hour window

export async function rateLimitMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  // Get client IP from Cloudflare headers
  const ip =
    c.req.header('CF-Connecting-IP') ||
    c.req.header('X-Forwarded-For')?.split(',')[0].trim() ||
    'unknown';

  const now = Date.now();
  const record = uploadCounts.get(ip);

  if (!record || now > record.resetAt) {
    // New window
    uploadCounts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
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
