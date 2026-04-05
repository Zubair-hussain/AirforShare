import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AirForShare — Instant File & Text Sharing',
  description: 'Drop a file or paste text. Get a 6-digit code. Share instantly. No signup, no storage, gone in 30 minutes.',
  keywords: ['file sharing', 'instant share', 'no signup', 'temporary file transfer'],
  openGraph: {
    title: 'AirForShare',
    description: 'Instant file sharing — no signup required',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
