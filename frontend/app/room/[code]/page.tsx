'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { getRoomInfo, ShareInfo, buildShareLink } from '../../../lib/api';
import FileReceiver from '../../../components/FileReceiver';
import Timer from '../../../components/Timer';

type State = 'loading' | 'ready' | 'expired' | 'not-found' | 'error';

export default function RoomPage() {
  const params = useParams();
  const roomCode = params.code as string;

  const [state, setState] = useState<State>('loading');
  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isUrl = (str: string) => {
    try { new URL(str); return true; } catch { return false; }
  };

  const fetchRoomInfo = async () => {
    if (!roomCode || !/^\d{6}$/.test(roomCode)) {
      setState('not-found');
      return;
    }
    try {
      const data = await getRoomInfo(roomCode);
      setInfo(data);
      setState('ready');
      // Stop polling once content is confirmed
      if (data.content || data.type === 'file') stopPolling();
    } catch (err: any) {
      if (err.expired) setState('expired');
      else if (err.message?.toLowerCase().includes('not found')) setState('not-found');
      else setState('error');
    }
  };

  const startPolling = () => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(fetchRoomInfo, 2000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  useEffect(() => {
    fetchRoomInfo();
    startPolling();
    return () => stopPolling();
  }, [roomCode]);

  const copyText = async () => {
    if (!info?.content) return;
    await navigator.clipboard.writeText(info.content);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const copyRoomLink = async () => {
    const link = buildShareLink(roomCode);
    await navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <main className="page">
      {/* Back link */}
      <a href="/" className="back-link animate-in">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        AirForShare
      </a>

      <div className="room-card card animate-in" style={{ animationDelay: '60ms' }}>

        {/* ── Loading ── */}
        {state === 'loading' && (
          <div className="center-state">
            <div className="spinner-ring" />
            <p className="state-text">
              Looking up room <span className="mono">{roomCode}</span>...
            </p>
          </div>
        )}

        {/* ── Not found ── */}
        {state === 'not-found' && (
          <div className="center-state">
            <div className="state-icon">🔍</div>
            <p className="state-title">Room not found</p>
            <p className="state-sub">Double-check the code or ask the sender to reshare.</p>
            <a href="/" className="btn-ghost" style={{ marginTop: 8 }}>Go home</a>
          </div>
        )}

        {/* ── Expired ── */}
        {state === 'expired' && (
          <div className="center-state">
            <div className="state-icon">⏱️</div>
            <p className="state-title">This share has expired</p>
            <p className="state-sub">Files are automatically deleted after 30 minutes.</p>
            <a href="/" className="btn-primary" style={{ marginTop: 8 }}>Share something new</a>
          </div>
        )}

        {/* ── Error ── */}
        {state === 'error' && (
          <div className="center-state">
            <div className="state-icon">⚠️</div>
            <p className="state-title">Something went wrong</p>
            <p className="state-sub">Check your connection and try again.</p>
            <button className="btn-ghost" onClick={fetchRoomInfo} style={{ marginTop: 8 }}>
              Retry
            </button>
          </div>
        )}

        {/* ── Ready — file ── */}
        {state === 'ready' && info?.type === 'file' && (
          <div className="ready-wrap">
            <div className="room-header">
              <div className="room-tag-row">
                <p className="room-tag">Room <span className="mono">{roomCode}</span></p>
                {/* Network badge — only shown on real LAN (not via ngrok) */}
                {info.sameNetwork && (
                  <span className="network-chip">⚡ Same WiFi</span>
                )}
              </div>
              <p className="room-title">Your file is ready</p>

              {/* Copy room link */}
              <button className="copy-link-btn" onClick={copyRoomLink}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M5 2H2a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V8M8 1h4m0 0v4m0-4L5.5 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {copiedLink ? 'Link copied!' : 'Copy share link'}
              </button>
            </div>

            <FileReceiver info={info} onExpired={() => setState('expired')} />
          </div>
        )}

        {/* ── Ready — text ── */}
        {state === 'ready' && info?.type === 'text' && info.content && (
          <div className="ready-wrap">
            <div className="room-header">
              <div className="room-tag-row">
                <p className="room-tag">Room <span className="mono">{roomCode}</span></p>
                {info.sameNetwork && (
                  <span className="network-chip">⚡ Same WiFi</span>
                )}
              </div>
              <p className="room-title">
                {isUrl(info.content) ? 'Shared link' : 'Shared text'}
              </p>
            </div>

            {isUrl(info.content) ? (
              <div className="link-box">
                <div className="link-icon">🔗</div>
                <a
                  href={info.content}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-href"
                >
                  {info.content}
                </a>
              </div>
            ) : (
              <div className="text-box">
                <pre className="text-content">{info.content}</pre>
              </div>
            )}

            <div className="text-actions">
              <button className="btn-primary" onClick={copyText} style={{ flex: 1 }}>
                {copiedText
                  ? '✓ Copied!'
                  : isUrl(info.content)
                  ? 'Copy Link'
                  : 'Copy Text'}
              </button>
              {isUrl(info.content) && (
                <a
                  href={info.content}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost"
                  style={{ flex: 1 }}
                >
                  Open Link ↗
                </a>
              )}
            </div>

            <div className="timer-footer">
              <span className="timer-label">Expires in</span>
              <Timer expiresAt={info.expiresAt} onExpired={() => setState('expired')} />
            </div>
          </div>
        )}
      </div>

      <style>{`
        .back-link {
          display: flex; align-items: center; gap: 6px;
          font-size: 14px; font-weight: 600; color: var(--text-muted);
          margin-bottom: 32px; transition: color var(--transition);
          align-self: flex-start;
        }
        .back-link:hover { color: var(--text); }

        .room-card { width: 100%; max-width: 500px; }

        .center-state {
          display: flex; flex-direction: column; align-items: center;
          gap: 12px; padding: 20px 0; text-align: center;
        }
        .spinner-ring {
          width: 40px; height: 40px;
          border: 2.5px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        .state-icon { font-size: 40px; }
        .state-title { font-size: 18px; font-weight: 700; }
        .state-text { font-size: 14px; color: var(--text-muted); }
        .state-sub { font-size: 14px; color: var(--text-muted); max-width: 280px; text-align: center; }

        .ready-wrap { display: flex; flex-direction: column; gap: 24px; }

        .room-header { border-bottom: 1px solid var(--border); padding-bottom: 20px; }
        .room-tag-row {
          display: flex; align-items: center;
          gap: 10px; margin-bottom: 4px;
        }
        .room-tag {
          font-size: 12px; font-weight: 600;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--text-muted);
          margin: 0;
        }

        /* Same-WiFi chip */
        .network-chip {
          display: inline-flex; align-items: center;
          padding: 2px 10px;
          background: rgba(52,211,153,0.1);
          border: 1px solid rgba(52,211,153,0.3);
          border-radius: 99px;
          font-size: 11px; font-weight: 700;
          color: #34d399;
          letter-spacing: 0.02em;
        }

        .room-title { font-size: 22px; font-weight: 800; margin: 4px 0 8px; }

        /* Copy room link button */
        .copy-link-btn {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 600;
          color: var(--text-muted);
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 6px 12px;
          transition: all var(--transition);
          margin-top: 4px;
        }
        .copy-link-btn:hover { color: var(--accent); border-color: var(--accent); }

        .link-box {
          display: flex; align-items: center; gap: 12px;
          padding: 16px;
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: var(--radius-sm); overflow: hidden;
        }
        .link-icon { font-size: 20px; flex-shrink: 0; }
        .link-href {
          font-size: 14px; color: var(--accent2);
          word-break: break-all;
          font-family: "JetBrains Mono", monospace;
        }
        .link-href:hover { text-decoration: underline; }

        .text-box {
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: var(--radius-sm); padding: 16px;
          max-height: 300px; overflow-y: auto;
        }
        .text-content {
          font-family: "JetBrains Mono", monospace;
          font-size: 13px; color: var(--text);
          white-space: pre-wrap; word-break: break-word; line-height: 1.6;
        }
        .text-actions { display: flex; gap: 10px; }

        .timer-footer {
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; padding-top: 4px;
        }
        .timer-label { color: var(--text-subtle); }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}