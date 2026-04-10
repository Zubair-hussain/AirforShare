'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import FileUploader from '../components/FileUploader';
import TextShare from '../components/TextShare';

const NearbyPanel = dynamic(() => import('../components/NearbyPanel'), { ssr: false });

type Tab = 'file' | 'text';

export default function HomePage() {
  const [tab, setTab] = useState<Tab>('file');

  return (
    <main className="page">

      {/* ── Corner registration marks (like the reference image) ─── */}
      <span className="corner-mark tl" aria-hidden="true" />
      <span className="corner-mark tr" aria-hidden="true" />
      <span className="corner-mark bl" aria-hidden="true" />
      <span className="corner-mark br" aria-hidden="true" />

      {/* ── Centered decorations ────────────────────────────────────── */}
      <div className="center-marks">
        <div className="center-mark-v" />
        <div className="center-mark-h" />
        <div className="plus-mark" />
      </div>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <header className="hero animate-up">
        <div className="brand">
          <div className="brand-icon" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <path d="M13 2L5 11h5.5v11h5V11H21L13 2z" fill="#0d0f10"/>
              <path d="M13 2L5 11h5.5v11h5V11H21L13 2z" fill="url(#brand-grad)" fillOpacity="0.9"/>
              <defs>
                <linearGradient id="brand-grad" x1="5" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#00e5a0"/>
                  <stop offset="1" stopColor="#0095ff"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="brand-name">NearDrop</span>
        </div>

        <h1 className="hero-headline">
          Drop anything.<br/>
          <span className="headline-accent">Your WiFi catches it.</span>
        </h1>
        <p className="hero-sub">
          Share files and text with every device on your network — instantly.<br/>
          No signup. No codes. No friction.
        </p>
      </header>

      {/* ── Main Action Stack ─────────────────────────────────────── */}
      <div className="focused-stack animate-in" style={{ animationDelay: '80ms' }}>
        {/* Send card */}
        <section className="panel main-card" aria-label="Action panel">
          <div className="tabs" role="tablist">
            <button
              id="tab-file"
              role="tab"
              aria-selected={tab === 'file'}
              className={`tab ${tab === 'file' ? 'active' : ''}`}
              onClick={() => setTab('file')}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M4 2h6l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" fill="none"/>
                <path d="M10 2v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/>
              </svg>
              File
            </button>
            <button
              id="tab-text"
              role="tab"
              aria-selected={tab === 'text'}
              className={`tab ${tab === 'text' ? 'active' : ''}`}
              onClick={() => setTab('text')}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M3 4h10M3 8h8M3 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Text / Link
            </button>
          </div>

          <div key={tab} className="tab-content animate-in">
            {tab === 'file' ? <FileUploader /> : <TextShare />}
          </div>
        </section>

        {/* Discovery area (Integrated below) */}
        <section className="discovery-section" aria-label="Discovery section">
          <NearbyPanel />
        </section>
      </div>

      {/* ── How to use ────────────────────────────────────────────── */}
      <section className="how-section animate-in" style={{ animationDelay: '160ms' }} aria-labelledby="how-heading">
        <div className="how-header">
          <div className="how-pill">How it works</div>
          <h2 id="how-heading" className="how-title">Three steps. That's it.</h2>
        </div>

        <div className="how-steps">
          {[
            {
              num: '01',
              icon: (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M11 3v10M7 7l4-4 4 4" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 16v1a2 2 0 002 2h10a2 2 0 002-2v-1" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" opacity="0.5"/>
                </svg>
              ),
              title: 'Drop your content',
              desc: 'Drag & drop a file or paste any text, link or password into the Send panel.',
            },
            {
              num: '02',
              icon: (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <circle cx="11" cy="11" r="2" fill="var(--accent)"/>
                  <path d="M7.5 14.5a5 5 0 017 0" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" opacity="0.6"/>
                  <path d="M4.5 17.5a9 9 0 0113 0" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" opacity="0.3"/>
                </svg>
              ),
              title: 'It broadcasts instantly',
              desc: 'NearDrop pushes your content to all devices on the same WiFi — automatically, no code needed.',
            },
            {
              num: '03',
              icon: (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M11 3v10M7 9l4 4 4-4" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 16v1a2 2 0 002 2h10a2 2 0 002-2v-1" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" opacity="0.5"/>
                </svg>
              ),
              title: 'Anyone nearby receives',
              desc: 'Open NearDrop on any device — files and texts appear in the Nearby panel. Click to download or copy.',
            },
          ].map((step, i) => (
            <div key={i} className="how-step">
              <div className="step-num">{step.num}</div>
              <div className="step-icon-wrap">{step.icon}</div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="footer">
        <span>NearDrop</span>
        <span className="footer-sep">·</span>
        <span>Files auto-delete after 30 minutes</span>
        <span className="footer-sep">·</span>
        <span>No data is stored permanently</span>
      </footer>

      <style>{`
        /* ── Hero ── */
        .hero {
          text-align: center;
          margin-bottom: 48px;
          max-width: 600px;
        }
        .brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 24px;
        }
        .brand-icon {
          width: 44px; height: 44px;
          border-radius: 13px;
          background: linear-gradient(135deg, rgba(0,229,160,0.15), rgba(0,149,255,0.1));
          border: 1px solid rgba(0,229,160,0.25);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 24px rgba(0,229,160,0.12);
        }
        .brand-name {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: var(--text);
        }
        .hero-headline {
          font-size: clamp(36px, 6vw, 58px);
          font-weight: 900;
          letter-spacing: -0.04em;
          line-height: 1.05;
          color: var(--text);
          margin-bottom: 18px;
        }
        .headline-accent {
          background: linear-gradient(90deg, var(--accent), var(--accent2));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-sub {
          font-size: 16px;
          color: var(--text-muted);
          line-height: 1.7;
          margin-bottom: 24px;
          font-weight: 400;
        }
        .hero-badges {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          background: rgba(0,229,160,0.06);
          border: 1px solid rgba(0,229,160,0.15);
          border-radius: 99px;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted);
        }

        /* ── Two column ── */
        .two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          width: 100%;
          max-width: 940px;
          align-items: start;
        }
        @media (max-width: 720px) {
          .two-col { grid-template-columns: 1fr; }
        }

        /* ── Panel ── */
        .panel {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 24px;
          position: relative;
          transition: border-color var(--transition);
        }
        .panel:hover {
          border-color: rgba(255,255,255,0.1);
        }

        .panel-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 18px;
        }
        .panel-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .panel-dot.green {
          background: var(--accent);
          box-shadow: 0 0 8px rgba(0,229,160,0.6);
          animation: dot-throb 2s ease-in-out infinite;
        }
        .panel-dot.blue {
          background: var(--accent2);
          box-shadow: 0 0 8px rgba(0,149,255,0.5);
          animation: dot-throb 2s ease-in-out infinite 0.5s;
        }
        @keyframes dot-throb {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.5; transform: scale(0.7); }
        }
        .panel-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: var(--text-muted);
        }

        /* ── Tabs ── */
        .tabs {
          display: flex;
          gap: 3px;
          padding: 3px;
          background: var(--surface2);
          border-radius: 10px;
          margin-bottom: 20px;
        }
        .tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 9px 14px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
          background: transparent;
          border-radius: 8px;
          transition: all var(--transition);
        }
        .tab:hover { color: var(--text); }
        .tab.active {
          background: var(--surface3);
          color: var(--text);
          box-shadow: 0 1px 6px rgba(0,0,0,0.5);
        }
        .tab-content { animation: fadeIn 0.2s ease both; }

        /* ── How it works ── */
        .how-section {
          width: 100%;
          max-width: 940px;
          margin-top: 64px;
        }
        .how-header {
          text-align: center;
          margin-bottom: 40px;
        }
        .how-pill {
          display: inline-block;
          padding: 4px 14px;
          background: rgba(0,229,160,0.07);
          border: 1px solid rgba(0,229,160,0.18);
          border-radius: 99px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--accent);
          margin-bottom: 14px;
        }
        .how-title {
          font-size: 30px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--text);
        }

        .how-steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 640px) {
          .how-steps { grid-template-columns: 1fr; }
        }

        .how-step {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 28px 24px;
          position: relative;
          overflow: hidden;
          transition: border-color var(--transition), transform var(--transition);
        }
        .how-step::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(0,229,160,0.3), transparent);
          opacity: 0;
          transition: opacity var(--transition);
        }
        .how-step:hover { border-color: rgba(0,229,160,0.15); transform: translateY(-2px); }
        .how-step:hover::before { opacity: 1; }

        .step-num {
          font-size: 11px;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          color: var(--accent);
          letter-spacing: 0.1em;
          margin-bottom: 14px;
        }
        .step-icon-wrap {
          width: 46px; height: 46px;
          border-radius: 13px;
          background: rgba(0,229,160,0.07);
          border: 1px solid rgba(0,229,160,0.15);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 14px;
        }
        .step-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 8px;
          letter-spacing: -0.01em;
        }
        .step-desc {
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.7;
        }

        /* ── Footer ── */
        .footer {
          margin-top: 64px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          color: var(--text-subtle);
          flex-wrap: wrap;
          justify-content: center;
        }
        .footer-sep { color: var(--text-subtle); }
      `}</style>
    </main>
  );
}