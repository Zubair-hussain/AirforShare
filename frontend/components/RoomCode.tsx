'use client';

import { useState } from 'react';
import { buildShareLink } from '../lib/api';
import Timer from './Timer';

interface RoomCodeProps {
  roomCode: string;
  expiresAt: number;
  onExpired?: () => void;
}

export default function RoomCode({ roomCode, expiresAt, onExpired }: RoomCodeProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const digits = roomCode.split('');
  const shareLink = buildShareLink(roomCode);

  const copyCode = async () => {
    await navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="room-code-wrap animate-in">
      <p className="room-label">Room code</p>

      <button className="digits-row" onClick={copyCode} title="Click to copy code">
        {digits.map((d, i) => (
          <span key={i} className="digit">{d}</span>
        ))}
      </button>

      <p className="copy-hint">{copiedCode ? '✓ Copied!' : 'Click code to copy'}</p>

      <div className="actions-row">
        <button className="btn-ghost" onClick={copyLink}>
          {copiedLink ? (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4H4a2 2 0 000 4h4a2 2 0 000-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M10 12h2a2 2 0 000-4H8a2 2 0 000 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M6.5 8h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Copy Link
            </>
          )}
        </button>

        <Timer expiresAt={expiresAt} onExpired={onExpired} />
      </div>

      <style>{`
        .room-code-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          width: 100%;
        }
        .room-label {
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .digits-row {
          display: flex;
          gap: 10px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 12px;
          transition: background var(--transition);
        }
        .digits-row:hover { background: var(--surface2); }
        .digit {
          width: 52px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'JetBrains Mono', monospace;
          font-size: 36px;
          font-weight: 500;
          color: var(--accent);
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 10px;
          transition: all 200ms;
        }
        .digits-row:hover .digit {
          border-color: var(--accent-glow);
          box-shadow: 0 0 24px var(--accent-glow);
        }
        .copy-hint {
          font-size: 12px;
          color: var(--text-subtle);
        }
        .actions-row {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          justify-content: center;
        }
        @media (max-width: 480px) {
          .digit { width: 40px; height: 52px; font-size: 28px; }
          .digits-row { gap: 6px; }
        }
      `}</style>
    </div>
  );
}
