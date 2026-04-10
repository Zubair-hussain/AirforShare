import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'NearDrop — Drop Files Instantly to Nearby Devices',
  description: 'Drop a file or paste text. Anyone on your WiFi sees it instantly — no signup, no codes, no friction.',
  keywords: ['file sharing', 'instant share', 'no signup', 'proximity sharing', 'wifi sharing', 'neardrop'],
  openGraph: {
    title: 'NearDrop',
    description: 'Drop files to nearby devices instantly — no code, no signup',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          async
          defer
          strategy="afterInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
