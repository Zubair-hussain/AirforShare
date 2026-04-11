'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getNetworkId, fetchNetworkShares, getDownloadUrl, getRoomInfo, formatFileSize } from '../lib/api';

interface NearbyShare {
  id: string;
  room_code: string;
  share_id: string;
  type: 'file' | 'text';
  file_name?: string;
  file_size?: number;
  file_size_original?: number;
  file_type?: string;
  is_compressed?: number;
  expires_at: number;
  created_at: number;
  content?: string;
}

type Status = 'loading' | 'ready' | 'error' | 'empty';

export default function NearbyPanel() {
  const [status, setStatus] = useState<Status>('loading');
  const [shares, setShares] = useState<NearbyShare[]>([]);
  const [networkId, setNetworkId] = useState<string | null>(null);
  const [expandedText, setExpandedText] = useState<Record<string, string>>({});
  const [downloading, setDownloading] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadShares = useCallback(async (netId: string) => {
    try {
      const data = await fetchNetworkShares(netId);
      const active = (data as NearbyShare[]).filter(s => Date.now() < s.expires_at);
      setShares(active);
      setStatus(active.length === 0 ? 'empty' : 'ready');
      setLastRefresh(Date.now());
    } catch {
      // Keep last known state silently
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setStatus('loading');
      try {
        const netId = await getNetworkId();
        if (cancelled) return;

        if (!netId) {
          setStatus('error');
          return;
        }

        setNetworkId(netId);
        await loadShares(netId);

        pollRef.current = setInterval(() => {
          if (!cancelled) loadShares(netId);
        }, 4000);
      } catch {
        if (!cancelled) setStatus('error');
      }
    }

    init();
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadShares]);

  const handleTextExpand = (roomCode: string) => {
    if (expandedText[roomCode] !== undefined) {
      const next = { ...expandedText };
      delete next[roomCode];
      setExpandedText(next);
      return;
    }
    
    // With hydrated discovery, content is already in the share object
    const share = shares.find(s => s.room_code === roomCode);
    if (share?.type === 'text') {
      setExpandedText(prev => ({ ...prev, [roomCode]: share.content || '' }));
    }
  };

  const handleDownload = (share: NearbyShare) => {
    setDownloading(share.room_code);
    window.location.href = getDownloadUrl(share.room_code);
    setTimeout(() => setDownloading(null), 2500);
  };

  // ── Minimal Scanning / Empty State ─────────────────────────────────
  if (status === 'loading' || status === 'error' || status === 'empty') {
    return (
      <div className="np-state">
        <div className="np-pulse-ring">
          <div className="np-ring np-ring-1" />
          <div className="np-ring np-ring-2" />
          <div className="np-ring np-ring-3" />
          <div className="np-core" />
        </div>
        
        <h3 className="np-state-title">
          {status === 'loading' ? 'Initializing...' : 
           status === 'error' ? 'Network Error' : 'Scanning WiFi...'}
        </h3>
        
        <p className="np-state-sub">
          {status === 'loading' ? 'Preparing secure discovery...' :
           status === 'error' ? 'Unable to reach backend. Check your connection.' :
           'Waiting for nearby shares to appear. No codes needed.'}
        </p>

        {status === 'empty' && (
          <div className="np-scan-bar">
            <div className="np-scan-fill" />
          </div>
        )}

        <NPStyles />
      </div>
    );
  }

  // ── Ready — share list ───────────────────────────────────────────────
  return (
    <div className="np-list-wrap">
      <div className="np-toolbar">
        <div className="np-count-label">
          <span className="np-count-num">{shares.length}</span> Active {shares.length === 1 ? 'Share' : 'Shares'}
        </div>
        <div className="np-live-badge">
          <span className="np-live-dot" />
          LIVE
        </div>
      </div>

      <div className="np-list" role="list">
        {shares.map(share => (
          <div key={share.room_code} className="np-item" role="listitem">
            <button
              className="np-row"
              onClick={() =>
                share.type === 'file' ? handleDownload(share) : handleTextExpand(share.room_code)
              }
              disabled={downloading === share.room_code}
              aria-label={share.type === 'file' ? `Download ${share.file_name}` : `View shared text`}
            >
              <FileTypeIcon type={share.file_type || (share.type === 'text' ? 'text/plain' : '')} />

              <div className="np-info">
                <span className="np-name">{share.file_name || 'Shared text'}</span>
                <span className="np-meta">
                  {share.file_size ? formatFileSize(share.file_size) + '  ·  ' : ''}
                  <ExpiryLabel expiresAt={share.expires_at} />
                </span>
              </div>

              <div className="np-action-icon">
                {(downloading === share.room_code) ? (
                  <span className="np-spinner" />
                ) : share.type === 'file' ? (
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M7.5 1.5v9M4 7l3.5 3.5L11 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M1.5 12.5h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg
                    width="14" height="14" viewBox="0 0 14 14" fill="none"
                    style={{ transform: expandedText[share.room_code] !== undefined ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
                  >
                    <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </button>

            {expandedText[share.room_code] !== undefined && (
              <div className="np-text-expand animate-in">
                <pre className="np-text-pre">{expandedText[share.room_code]}</pre>
                <button
                  className="btn-ghost np-copy-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(expandedText[share.room_code]);
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M2 9V2.5A.5.5 0 012.5 2H9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  Copy text
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="np-footer-bar">
        <span>Polling network...</span>
        <span className="np-refresh-time">{secondsAgo(lastRefresh)}</span>
      </div>

      <NPStyles />
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

function secondsAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 2) return 'connected';
  return `${s}s ago`;
}

function ExpiryLabel({ expiresAt }: { expiresAt: number }) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    const update = () => {
      const rem = expiresAt - Date.now();
      if (rem <= 0) { setLabel('expired'); return; }
      const m = Math.floor(rem / 60000);
      const s = Math.floor((rem % 60000) / 1000);
      setLabel(`${m}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  return <span>{label}</span>;
}

function FileTypeIcon({ type }: { type: string }) {
  const isImage = type.startsWith('image/');
  const isPdf   = type === 'application/pdf';
  const isVideo = type.startsWith('video/');
  const isAudio = type.startsWith('audio/');
  const isText  = type === 'text/plain' || !type;

  let color = '#7c3aed';
  let label = 'BIN';
  if (isImage) { color = 'var(--accent)'; label = 'IMG'; }
  if (isPdf)   { color = '#ff4d6a'; label = 'PDF'; }
  if (isVideo) { color = '#0095ff'; label = 'VID'; }
  if (isAudio) { color = '#ffb547'; label = 'AUD'; }
  if (isText)  { color = 'var(--accent2)'; label = 'TXT'; }

  return (
    <div style={{
      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
      background: `${color}12`,
      border: `1px solid ${color}22`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '10px', fontWeight: 800, color,
      letterSpacing: '0.05em',
    }}>
      {label}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────
function NPStyles() {
  return (
    <style>{`
      .np-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 40px 24px;
        gap: 12px;
        flex: 1;
      }
      .np-state-title {
        font-size: 16px; font-weight: 800; color: var(--text); margin: 0;
        letter-spacing: -0.01em;
      }
      .np-state-sub {
        font-size: 13px; color: var(--text-muted);
        line-height: 1.6; margin: 0; max-width: 240px;
      }

      /* ── Pulse ring radar ── */
      .np-pulse-ring {
        position: relative;
        width: 100px; height: 100px;
        margin-bottom: 12px;
      }
      .np-ring {
        position: absolute;
        border-radius: 50%;
        border: 1.5px solid var(--accent);
        top: 50%; left: 50%;
        transform: translate(-50%,-50%);
        animation: np-radar 3s cubic-bezier(0.2, 0, 0.4, 1) infinite;
        opacity: 0;
      }
      .np-ring-1 { width: 30px; height: 30px; animation-delay: 0s; }
      .np-ring-2 { width: 60px; height: 60px; animation-delay: 1s; }
      .np-ring-3 { width: 100px; height: 100px; animation-delay: 2s; }
      .np-core {
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%,-50%);
        width: 12px; height: 12px; border-radius: 50%;
        background: var(--accent);
        box-shadow: 0 0 20px var(--accent);
        z-index: 2;
      }
      @keyframes np-radar {
        0%   { opacity: 0;   transform: translate(-50%,-50%) scale(0.1); }
        20%  { opacity: 0.5; }
        100% { opacity: 0;   transform: translate(-50%,-50%) scale(1.2); }
      }

      /* ── Scanning bar ── */
      .np-scan-bar {
        width: 120px; height: 3px;
        background: var(--surface2);
        border-radius: 99px; overflow: hidden;
        margin-top: 8px;
      }
      .np-scan-fill {
        display: block; height: 100%; width: 40%;
        background: linear-gradient(90deg, transparent, var(--accent), transparent);
        animation: np-scan 1.5s ease-in-out infinite;
        border-radius: 99px;
      }
      @keyframes np-scan {
        0%   { transform: translateX(-100%); }
        100% { transform: translateX(250%); }
      }

      /* ── Share list ── */
      .np-list-wrap { display: flex; flex-direction: column; height: 100%; }

      .np-toolbar {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 18px;
        padding: 0 4px;
      }
      .np-count-label {
        font-size: 13px; color: var(--text-muted); font-weight: 500;
      }
      .np-count-num { color: var(--text); font-weight: 800; font-family: 'JetBrains Mono', monospace; }

      .np-live-badge {
        display: flex; align-items: center; gap: 6px;
        padding: 4px 10px;
        background: rgba(0,229,160,0.08);
        border: 1px solid rgba(0,229,160,0.2);
        border-radius: 99px;
        font-size: 10px; font-weight: 800; color: var(--accent);
        letter-spacing: 0.08em;
      }
      .np-live-dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: var(--accent);
        animation: np-blink 1.5s ease-in-out infinite;
      }
      @keyframes np-blink {
        0%,100% { opacity: 1; transform: scale(1); }
        50%      { opacity: 0.3; transform: scale(0.8); }
      }

      .np-list {
        display: flex; flex-direction: column;
        background: var(--surface2);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        flex: 1;
        overflow-y: auto;
      }
      .np-item { border-bottom: 1px solid var(--border); }
      .np-item:last-child { border-bottom: none; }

      .np-row {
        display: flex; align-items: center; gap: 14px;
        width: 100%; padding: 14px 16px;
        background: transparent; border: none;
        cursor: pointer; text-align: left;
        transition: background var(--transition);
      }
      .np-row:hover:not(:disabled) { background: rgba(255,255,255,0.03); }
      .np-row:disabled { opacity: 0.6; cursor: wait; }

      .np-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
      .np-name {
        font-size: 13.5px; font-weight: 600; color: var(--text);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .np-meta {
        font-size: 10.5px; color: var(--text-muted);
        font-family: 'JetBrains Mono', monospace;
        text-transform: uppercase; letter-spacing: 0.04em;
        display: flex; align-items: center; gap: 6px;
      }

      .np-action-icon {
        flex-shrink: 0; color: var(--text-muted);
        display: flex; align-items: center; justify-content: center;
        transition: color var(--transition), transform 0.2s;
      }
      .np-row:hover .np-action-icon { color: var(--text); transform: scale(1.1); }

      .np-spinner {
        width: 16px; height: 16px; border-radius: 50%;
        border: 2px solid var(--border); border-top-color: var(--accent);
        animation: spin 0.8s linear infinite;
      }

      /* ── Text expand ── */
      .np-text-expand {
        padding: 0 16px 16px;
        background: rgba(0,229,160,0.02);
      }
      .np-text-pre {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12.5px; color: var(--text);
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 12px;
        white-space: pre-wrap; word-break: break-word;
        margin: 0 0 12px;
        max-height: 200px; overflow-y: auto;
        line-height: 1.6;
      }
      .np-copy-btn { width: 100%; font-size: 12px; padding: 10px 16px; height: auto; }

      /* ── Footer ── */
      .np-footer-bar {
        margin-top: 14px;
        display: flex; align-items: center; justify-content: space-between;
        font-size: 11px; color: var(--text-subtle);
        font-family: 'JetBrains Mono', monospace;
        padding: 0 4px;
      }
      .np-refresh-time { color: var(--text-muted); font-weight: 600; }
    `}</style>
  );
}

