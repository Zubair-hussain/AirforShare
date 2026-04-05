'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // ✅ added
import FileUploader from '../components/FileUploader';
import TextShare from '../components/TextShare';

type Tab = 'file' | 'text';

export default function HomePage() {
  const [tab, setTab] = useState<Tab>('file');
  const [roomInput, setRoomInput] = useState('');
  const router = useRouter(); // ✅ added

  const handleJoin = () => {
    const code = roomInput.replace(/\D/g, '').slice(0, 6);
    if (code.length === 6) {
      router.push(`/room/${code}`); // ✅ updated (no reload)
    }
  };

  return (
    <main className="page">
      {/* ── Logo ───────────────────────────────────────────────────── */}
      <header className="header animate-in">
        <div className="logo">
          <div className="logo-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L3 8h4v8h6V8h4L10 2z" fill="var(--accent)" />
            </svg>
          </div>
          <span className="logo-text">AirForShare</span>
        </div>
        <p className="tagline">Instant sharing. No account. No trace.</p>
      </header>

      {/* ── Main card ──────────────────────────────────────────────── */}
      <div className="card main-card animate-in" style={{ animationDelay: '60ms' }}>

        {/* Tab switcher */}
        <div className="tabs">
          <button
            className={`tab ${tab === 'file' ? 'active' : ''}`}
            onClick={() => setTab('file')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 2h6l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3" fill="none"/>
              <path d="M10 2v4h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.5"/>
            </svg>
            File
          </button>
          <button
            className={`tab ${tab === 'text' ? 'active' : ''}`}
            onClick={() => setTab('text')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 4h10M3 8h8M3 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Text / Link
          </button>
        </div>

        {/* Tab content */}
        <div key={tab} className="tab-content animate-in">
          {tab === 'file' ? <FileUploader /> : <TextShare />}
        </div>
      </div>

      {/* ── Join room ──────────────────────────────────────────────── */}
      <div className="join-card animate-in" style={{ animationDelay: '120ms' }}>
        <p className="join-label">Receive with a room code</p>
        <div className="join-row">
          <input
            className="join-input mono"
            placeholder="Enter 6-digit code"
            value={roomInput}
            onChange={e => setRoomInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            maxLength={6}
          />
          <button
            className="btn-primary join-btn"
            onClick={handleJoin}
            disabled={roomInput.length !== 6}
          >
            Open
          </button>
        </div>
      </div>

      {/* ── Features ───────────────────────────────────────────────── */}
      <div className="features animate-in" style={{ animationDelay: '180ms' }}>
        {[
          { icon: '⚡', text: 'Instant transfer' },
          { icon: '🔒', text: 'No signup required' },
          { icon: '🗑️', text: 'Auto-deleted in 30 min' },
          { icon: '📱', text: 'Works on any device' },
        ].map(f => (
          <div key={f.text} className="feature">
            <span>{f.icon}</span>
            <span>{f.text}</span>
          </div>
        ))}
      </div>

      <style>{`
        .header {
          text-align: center;
          margin-bottom: 32px;
        }
        .logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        .logo-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: var(--accent-glow);
          border: 1px solid var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .logo-text {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--text);
        }
        .tagline {
          font-size: 14px;
          color: var(--text-muted);
        }
        .main-card {
          width: 100%;
          max-width: 500px;
        }
        .tabs {
          display: flex;
          gap: 4px;
          padding: 4px;
          background: var(--surface2);
          border-radius: 10px;
          margin-bottom: 28px;
        }
        .tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-muted);
          background: transparent;
          border-radius: 7px;
          transition: all var(--transition);
        }
        .tab:hover { color: var(--text); }
        .tab.active {
          background: var(--surface);
          color: var(--text);
          box-shadow: 0 1px 4px rgba(0,0,0,0.4);
        }
        .tab-content { animation: fadeIn 0.25s ease both; }
        .join-card {
          width: 100%;
          max-width: 500px;
          margin-top: 16px;
          padding: 20px 24px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
        }
        .join-label {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 12px;
        }
        .join-row { display: flex; gap: 10px; }
        .join-input {
          flex: 1;
          padding: 12px 16px;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text);
          font-size: 20px;
          font-weight: 500;
          letter-spacing: 0.15em;
          transition: border-color var(--transition);
        }
        .join-input:focus { outline: none; border-color: var(--accent); }
        .join-input::placeholder { color: var(--text-subtle); font-size: 14px; letter-spacing: normal; }
        .join-btn { padding: 12px 24px; }
        .features {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px 24px;
          margin-top: 32px;
          max-width: 500px;
        }
        .feature {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-muted);
        }

        @media (max-width: 480px) {
          .join-row { flex-direction: column; }
          .join-btn { width: 100%; }
        }
      `}</style>
    </main>
  );
}