/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Dev origins (ngrok tunneling) ───────────────────────────────────
  allowedDevOrigins: [
    "*.ngrok-free.app",
    "*.ngrok.io",
  ],

  // ── Output ───────────────────────────────────────────────────────────
  // 'standalone' for Vercel (default); use 'export' if deploying to CF Pages
  // output: 'export',

  // ── Images ───────────────────────────────────────────────────────────
  images: {
    // Cloudflare CDN will serve and optimize images
    domains: [],
    // Use Cloudflare Image Resizing if available on your plan
    // loader: 'custom',
    // loaderFile: './lib/cfImageLoader.ts',
  },

  // ── Security & CDN Headers ───────────────────────────────────────────
  // These headers are set at Next.js level; Cloudflare CDN will respect them.
  // Cloudflare also layers its own edge headers on top.
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // Stop MIME sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Force HTTPS (Cloudflare also enforces this at edge)
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Referrer policy
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Permissions policy — restrict unneeded browser features
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Basic XSS protection header (legacy browsers)
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Content Security Policy — allows Cloudflare Turnstile + Analytics
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Next.js inline scripts + Cloudflare scripts
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
              // Cloudflare Turnstile iframe
              "frame-src 'self' https://challenges.cloudflare.com",
              // Styles
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Fonts
              "font-src 'self' https://fonts.gstatic.com",
              // Connect to backend API + Cloudflare analytics beacon
              // Added 127.0.0.1:8787 and 127.0.0.1:8788 for local development reliability
              `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || ''} http://127.0.0.1:8787 http://127.0.0.1:8788 http://localhost:8787 http://localhost:8788 https://cloudflareinsights.com`,
              // Images from same origin + data URIs
              "img-src 'self' data: blob:",
            ].join('; '),
          },
        ],
      },
      {
        // Static assets — long cache (Cloudflare CDN will also cache these)
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Public folder assets
        source: '/(.*)\\.(ico|png|jpg|jpeg|svg|webp|woff2|woff)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      {
        // API routes — never cache
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
    ];
  },

  // ── Redirects ────────────────────────────────────────────────────────
  async redirects() {
    return [
      // Optional: redirect www → non-www (Cloudflare can also handle this)
      // { source: '/(.*)', has: [{ type: 'host', value: 'www.airforshare.com' }], destination: 'https://airforshare.com/:path*', permanent: true },
    ];
  },
};

export default nextConfig;
