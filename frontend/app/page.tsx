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

      {/* ── Main Action Grid ─────────────────────────────────────── */}
      <div className="main-grid animate-in" style={{ animationDelay: '80ms' }}>
        {/* Left Panel: Send */}
        <section className="panel-container send-panel" aria-label="Send panel">
          <div className="panel-header-simple">
            <span className="panel-dot green" />
            <span className="panel-label">Send Content</span>
          </div>

          <div className="panel main-card">
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
                Text
              </button>
            </div>

            <div key={tab} className="tab-content animate-in">
              {tab === 'file' ? <FileUploader /> : <TextShare />}
            </div>
          </div>
        </section>

        {/* Right Panel: Nearby */}
        <section className="panel-container nearby-panel" aria-label="Nearby panel">
          <div className="panel-header-simple">
            <span className="panel-dot blue" />
            <span className="panel-label">Nearby Devices</span>
          </div>
          <div className="panel discovery-card">
            <NearbyPanel />
          </div>
        </section>
      </div>

      {/* ── How to use ────────────────────────────────────────────── */}
      <section className="how-section animate-in" style={{ animationDelay: '160ms' }} aria-labelledby="how-heading">
        <div className="how-header">
          <div className="how-pill">How it works</div>
          <h2 id="how-heading" className="how-title">Zero Friction. No Codes.</h2>
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
              title: 'Drop content',
              desc: 'Share any file or text instantly from your device.',
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
              title: 'Auto-Broadcast',
              desc: 'It stays on your network — no codes, no links, no manual steps.',
            },
            {
              num: '03',
              icon: (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M11 3v10M7 9l4 4 4-4" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 16v1a2 2 0 002 2h10a2 2 0 002-2v-1" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" opacity="0.5"/>
                </svg>
              ),
              title: 'Others receive',
              desc: 'Anyone on the same WiFi sees it instantly in their Nearby panel.',
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
        <span>Secure Peer-to-Network Sharing</span>
        <span className="footer-sep">·</span>
        <span>No Data Storage</span>
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

        /* ── Main Action Grid ── */
        .main-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          width: 100%;
          max-width: 1080px;
          margin: 0 auto;
          align-items: start;
        }
        @media (max-width: 860px) {
          .main-grid { grid-template-columns: 1fr; max-width: 580px; }
        }

        .panel-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }
        .panel-header-simple {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-left: 4px;
        }
        .panel-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
        }
        .panel-dot.green { background: var(--accent); box-shadow: 0 0 10px var(--accent); }
        .panel-dot.blue  { background: var(--accent2); box-shadow: 0 0 10px var(--accent2); }
        .panel-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
        }

        /* ── Panel ── */
        .panel {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 24px;
          position: relative;
          transition: border-color var(--transition);
          min-height: 380px;
          display: flex;
          flex-direction: column;
        }
        .panel:hover {
          border-color: var(--border-hover);
        }
        .discovery-card {
          background: rgba(22, 27, 31, 0.4);
          backdrop-filter: blur(8px);
        }

        /* ── Tabs ── */
        .tabs {
          display: flex;
          gap: 4px;
          padding: 4px;
          background: var(--surface2);
          border-radius: 10px;
          margin-bottom: 20px;
        }
        .tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
          background: transparent;
          border-radius: 8px;
          transition: all var(--transition);
        }
        .tab:hover { color: var(--text); background: rgba(255,255,255,0.03); }
        .tab.active {
          background: var(--surface3);
          color: var(--text);
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .tab-content { animation: fadeIn 0.25s ease both; flex: 1; display: flex; flex-direction: column; }

        /* ── How it works ── */
        .how-section {
          width: 100%;
          max-width: 1080px;
          margin-top: 80px;
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
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--text);
        }

        .how-steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        @media (max-width: 860px) {
          .how-steps { grid-template-columns: 1fr; }
        }

        .how-step {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 32px 24px;
          position: relative;
          overflow: hidden;
          transition: border-color var(--transition), transform var(--transition);
        }
        .how-step:hover { border-color: var(--border-hover); transform: translateY(-4px); }

        .step-num {
          font-size: 11px;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          color: var(--accent);
          letter-spacing: 0.1em;
          margin-bottom: 16px;
        }
        .step-icon-wrap {
          width: 48px; height: 48px;
          border-radius: 12px;
          background: rgba(0,229,160,0.07);
          border: 1px solid rgba(0,229,160,0.15);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 16px;
        }
        .step-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 10px;
        }
        .step-desc {
          font-size: 13.5px;
          color: var(--text-muted);
          line-height: 1.6;
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