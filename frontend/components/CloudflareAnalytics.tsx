'use client';

// ── Cloudflare Web Analytics ─────────────────────────────────────────
// Drop this component into your root layout.tsx inside <body>
// Set NEXT_PUBLIC_CF_ANALYTICS_TOKEN in your .env.production
//
// Get your token at: dash.cloudflare.com → Analytics → Web Analytics → Sites
//
// This is privacy-first — no cookies, no PII, GDPR compliant.

import Script from 'next/script';

const CF_ANALYTICS_TOKEN = process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN;

export default function CloudflareAnalytics() {
  // Don't render in dev or if token missing
  if (!CF_ANALYTICS_TOKEN || process.env.NODE_ENV !== 'production') {
    return null;
  }

  return (
    <Script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token: CF_ANALYTICS_TOKEN })}
      strategy="afterInteractive"
    />
  );
}