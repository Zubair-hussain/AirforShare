import { Context, Next } from 'hono';
import { Env } from '../types';

export async function corsMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const origin = c.req.header('Origin') || '';
  const allowedOrigins = [
    c.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  // Allow ngrok URLs in development
  const isNgrokUrl = origin.includes('.ngrok') || origin.includes('ngrok-free.app');
  const isAllowed = isNgrokUrl || allowedOrigins.some(o => origin.startsWith(o));
  const allowOrigin = isAllowed ? origin : allowedOrigins[0];

  // Handle preflight
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Content-Length',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
        // Security headers
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:",
      },
    });
  }

  await next();

  // Apply security headers to all responses
  c.res.headers.set('Access-Control-Allow-Origin', allowOrigin);
  c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  c.res.headers.set('X-Content-Type-Options', 'nosniff');
  c.res.headers.set('X-Frame-Options', 'DENY');
  c.res.headers.set('X-XSS-Protection', '1; mode=block');
  c.res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  c.res.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:");
}
