'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getLanIp, getSubnetFromIp } from '../lib/lanDiscovery';
import {
  subscribeLanShares,
  fetchExistingLanShares,
  unsubscribeLanShares,
  LocalShare,
} from '../lib/supabaseRealtime';
import { formatFileSize } from '../lib/api';
import type { RealtimeChannel } from '@supabase/supabase-js';

export default function LanDiscoveryPanel() {
  const [shares, setShares] = useState<LocalShare[]>([]);
  const [subnet, setSubnet] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [lanIp, setLanIp] = useState<string | null>(null);
  const [expandedText, setExpandedText] = useState<Record<string, string>>({});
  const [expanding, setExpanding] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setScanning(true);

      // Step 1: Get real LAN IP via WebRTC STUN
      const ip = await getLanIp();
      if (cancelled) return;

      if (!ip) {
        // Not on a LAN (public internet) — hide panel entirely
        setScanning(false);
        return;
      }

      const sub = getSubnetFromIp(ip);
      if (!sub || cancelled) {
        setScanning(false);
        return;
      }

      setLanIp(ip);
      setSubnet(sub);

      // Step 2: Fetch existing shares on this subnet (late joiners)
      const existing = await fetchExistingLanShares(sub);
      if (!cancelled) {
        setShares(existing);
      }

      // Step 3: Subscribe to realtime new shares on this subnet
      channelRef.current = subscribeLanShares(sub, (newShare) => {
        if (!cancelled) {
          setShares((prev) => {
            // Avoid duplicates
            if (prev.find((s) => s.room_code === newShare.room_code)) return prev;
            return [newShare, ...prev];
          });
        }
      });

      setScanning(false);
    }

    init();

    return () => {
      cancelled = true;
      unsubscribeLanShares(channelRef.current);
    };
  }, []);

  // Also check localStorage for same-device fallback
  useEffect(() => {
    try {
      const stored = localStorage.getItem('afs_recent_share');
      if (!stored) return;
      const parsed = JSON.parse(stored) as LocalShare;
      if (Date.now() < parsed.expires_at) {
        setShares((prev) => {
          if (prev.find((s) => s.room_code === parsed.room_code)) return prev;
          return [parsed, ...prev];
        });
      } else {
        localStorage.removeItem('afs_recent_share');
      }
    } catch {}
  }, []);

  const handleShareClick = async (share: LocalShare) => {
    if (share.type === 'file') {
      const { getDownloadUrl } = await import('../lib/api');
      window.location.href = getDownloadUrl(share.room_code);
      return;
    }

    if (share.type === 'text') {
      if (expandedText[share.room_code] !== undefined) {
        const updated = { ...expandedText };
        delete updated[share.room_code];
        setExpandedText(updated);
        return;
      }
      setExpanding(share.room_code);
      try {
        const { getRoomInfo } = await import('../lib/api');
        const info = await getRoomInfo(share.room_code);
        setExpandedText((prev) => ({ ...prev, [share.room_code]: info.content || '' }));
      } catch (err) {
        setExpandedText((prev) => ({ ...prev, [share.room_code]: 'Failed to load text content.' }));
      } finally {
        setExpanding(null);
      }
    }
  };

  // Don't show anything if scanning or no subnet or no shares found
  if (scanning || !subnet || shares.length === 0) {
    if (scanning) {
      return (
        <div className="lan-scanning">
          <span className="scan-dot" />
          <span className="scan-dot" style={{ animationDelay: '0.2s' }} />
          <span className="scan-dot" style={{ animationDelay: '0.4s' }} />
          <span>Scanning nearby devices...</span>
        </div>
      );
    }
    return <div style={{ display: 'none' }} />;
  }

  return (
    <div className="lan-panel animate-in">
      {/* Header */}
      <div className="lan-header">
        <div className="lan-header-left">
          <div className="wifi-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 12.5a1 1 0 100 2 1 1 0 000-2z" fill="var(--accent)" />
              <path d="M4.5 9.5a5 5 0 017 0" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M2 7a8 8 0 0112 0" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
            </svg>
          </div>
          <div>
            <p className="lan-title">Nearby on your WiFi</p>
            <p className="lan-sub">Net ID: {lanIp?.substring(0, 8)} · {shares.length} file{shares.length !== 1 ? 's' : ''} available</p>
          </div>
        </div>
        <div className="live-badge">
          <span className="live-dot" />
          LIVE
        </div>
      </div>

      {/* Share list */}
      <div className="lan-list">
        {shares.map((share) => (
          <div key={share.room_code} className="lan-share-card">
            <button
              className="lan-share-item"
              onClick={() => handleShareClick(share)}
              disabled={expanding === share.room_code}
            >
              <div className="lan-file-icon">
                <FileTypeIcon type={share.file_type || ''} />
              </div>
              <div className="lan-file-info">
                <p className="lan-file-name">{share.file_name || 'Shared text'}</p>
                <p className="lan-file-meta">
                  {share.file_size ? formatFileSize(share.file_size) : ''}
                  {share.is_compressed && share.file_size_original
                    ? ` · ${((1 - share.file_size! / share.file_size_original) * 100).toFixed(0)}% smaller`
                    : ''}
                  {' · '}
                  <ExpiryLabel expiresAt={share.expires_at} />
                </p>
              </div>
              <div className="lan-arrow">
                {expanding === share.room_code ? (
                  <span className="spinner-small" />
                ) : share.type === 'file' ? (
                  <div className="dl-icon">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M7 1v9M3 7l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: expandedText[share.room_code] !== undefined ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
                    <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </button>
            {expandedText[share.room_code] !== undefined && (
              <div className="lan-expanded-text-wrap animate-in">
                <pre className="lan-expanded-text">{expandedText[share.room_code]}</pre>
                <button
                  className="btn-ghost"
                  onClick={() => navigator.clipboard.writeText(expandedText[share.room_code])}
                  style={{ width: '100%', marginTop: 8 }}
                >
                  Copy Text
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .lan-scanning {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-muted);
          padding: 8px 0;
          justify-content: center;
        }
        .scan-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: var(--accent);
          animation: scan-pulse 1.2s ease-in-out infinite;
        }
        @keyframes scan-pulse {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }

        .lan-panel {
          width: 100%;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
        }

        .lan-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid var(--border);
          background: rgba(99, 102, 241, 0.04);
        }
        .lan-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .wifi-icon {
          width: 36px; height: 36px;
          border-radius: 10px;
          background: var(--accent-glow);
          border: 1px solid var(--accent);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .lan-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--text);
          margin: 0;
        }
        .lan-sub {
          font-size: 11px;
          color: var(--text-muted);
          font-family: 'JetBrains Mono', monospace;
          margin: 2px 0 0;
        }

        .live-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          background: rgba(52, 211, 153, 0.1);
          border: 1px solid rgba(52, 211, 153, 0.3);
          border-radius: 99px;
          font-size: 10px;
          font-weight: 800;
          color: #34d399;
          letter-spacing: 0.08em;
        }
        .live-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #34d399;
          animation: pulse-dot 1.8s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }

        .lan-list {
          display: flex;
          flex-direction: column;
        }

        .lan-share-card {
          border-bottom: 1px solid var(--border);
        }
        .lan-share-card:last-child {
          border-bottom: none;
        }

        .lan-share-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          width: 100%;
          text-align: left;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: background var(--transition);
        }
        .lan-share-item:hover:not(:disabled) { background: var(--surface); }
        .lan-share-item:disabled { opacity: 0.7; cursor: wait; }

        .lan-file-icon { flex-shrink: 0; }
        .lan-file-info { flex: 1; min-width: 0; }
        .lan-file-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin: 0;
        }
        .lan-file-meta {
          font-size: 11px;
          color: var(--text-muted);
          font-family: 'JetBrains Mono', monospace;
          margin: 3px 0 0;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .lan-arrow {
          color: var(--text-muted);
          flex-shrink: 0;
          transition: transform var(--transition), color var(--transition);
          display: flex; align-items: center; justify-content: center;
        }
        .lan-share-item:hover .lan-arrow {
          color: var(--accent);
        }
        
        .dl-icon {
          display: flex; align-items: center; justify-content: center;
          width: 24px; height: 24px; border-radius: 50%;
          background: rgba(99, 102, 241, 0.1); color: var(--accent);
        }

        .spinner-small {
          width: 14px; height: 14px; border-radius: 50%;
          border: 2px solid var(--border); border-top-color: var(--accent);
          animation: spin 0.6s linear infinite;
        }

        .lan-expanded-text-wrap {
          padding: 0 16px 16px;
          background: rgba(99, 102, 241, 0.02);
        }
        .lan-expanded-text {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px; color: var(--text);
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius-sm); padding: 12px;
          white-space: pre-wrap; word-break: break-word;
          margin: 0; max-height: 200px; overflow-y: auto;
        }
      `}</style>
    </div>
  );
}

function ExpiryLabel({ expiresAt }: { expiresAt: number }) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    const update = () => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) { setLabel('expired'); return; }
      const m = Math.floor(remaining / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setLabel(`${m}:${s.toString().padStart(2, '0')} left`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  return <span>{label}</span>;
}

function FileTypeIcon({ type }: { type: string }) {
  const isImage = type.startsWith('image/');
  const isPdf = type === 'application/pdf';
  const isVideo = type.startsWith('video/');
  const isAudio = type.startsWith('audio/');

  let color = 'var(--accent2)';
  let label = 'FILE';
  if (isImage) { color = '#34d399'; label = 'IMG'; }
  if (isPdf) { color = '#f87171'; label = 'PDF'; }
  if (isVideo) { color = '#a78bfa'; label = 'VID'; }
  if (isAudio) { color = '#fbbf24'; label = 'AUD'; }

  return (
    <div style={{
      width: 36, height: 36, borderRadius: 8,
      background: `${color}18`, border: `1px solid ${color}40`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
      fontWeight: 700, color,
    }}>
      {label}
    </div>
  );
}