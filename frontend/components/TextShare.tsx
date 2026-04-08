'use client';

import { useState } from 'react';
import { shareText } from '../lib/api';

export default function TextShare() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadResult, setUploadResult] = useState<{roomCode: string} | null>(null);

  const MAX = 10_000;
  const remaining = MAX - content.length;

  const submit = async () => {
    if (!content.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await shareText(content.trim());

      // ── LAN broadcast after upload ──────────────────────────────────
      try {
        const { getLanIp, getSubnetFromIp } = await import('../lib/lanDiscovery');
        const { broadcastLocalShare } = await import('../lib/supabaseRealtime');
        const lanIp = await getLanIp();
        const subnet = lanIp ? getSubnetFromIp(lanIp) : null;
        if (subnet) {
          const sharePayload = {
            subnet: subnet || 'unknown',
            room_code: res.roomCode,
            share_id: res.shareId,
            file_type: 'text/plain',
            type: 'text' as const,
            expires_at: res.expiresAt,
          };
          await broadcastLocalShare(sharePayload);
          try { localStorage.setItem('afs_recent_share', JSON.stringify(sharePayload)); } catch {}
        }
      } catch (e) {
        console.error('Text broadcast skipped', e);
      }

      // 🔥 AUTO REDIRECT (REMOVED)
      setUploadResult({ roomCode: res.roomCode });
      setContent('');

    } catch (err: any) {
      setError(err.message || 'Failed to share text');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section">
      {uploadResult ? (
        <div className="upload-success-panel animate-in">
          <div className="success-icon">✓</div>
          <p className="success-title">Shared successfully!</p>
          <p className="success-sub">
            Your text is now available on your WiFi network.
          </p>
          <div className="room-code-box">
            <span className="room-code-label">Remote Share Code</span>
            <span className="room-code-val mono">{uploadResult.roomCode}</span>
          </div>
          
          <button className="btn-ghost" onClick={() => setUploadResult(null)} style={{ marginTop: 16, width: '100%' }}>
            Share new text
          </button>
        </div>
      ) : (
        <>
          <div className="textarea-wrap">
            <textarea
              className="text-input"
              placeholder="Paste text, a link, a password, code..."
              value={content}
              onChange={e => setContent(e.target.value.slice(0, MAX))}
              rows={6}
              spellCheck={false}
            />
            <span className={`char-count ${remaining < 100 ? 'warn' : ''}`}>
              {remaining}
            </span>
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button
            className="btn-primary"
            onClick={submit}
            disabled={!content.trim() || loading}
            style={{ width: '100%' }}
          >
            {loading ? (
              <>
                <Spinner />
                Sharing...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M2 8h12M9 3l5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Share Text
              </>
            )}
          </button>
        </>
      )}

      <style>{`
        .section { display: flex; flex-direction: column; gap: 14px; }

        .textarea-wrap { position: relative; }

        .text-input {
          width: 100%;
          padding: 16px;
          padding-bottom: 32px;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text);
          font-size: 14px;
          font-family: 'JetBrains Mono', monospace;
          resize: vertical;
          min-height: 140px;
          transition: border-color var(--transition);
          line-height: 1.6;
        }

        .text-input:focus {
          outline: none;
          border-color: var(--accent);
        }

        .text-input::placeholder {
          color: var(--text-subtle);
        }

        .char-count {
          position: absolute;
          bottom: 10px;
          right: 12px;
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          color: var(--text-subtle);
        }

        .char-count.warn {
          color: var(--warning);
        }

        .error-msg {
          font-size: 13px;
          color: var(--danger);
          background: #f8717115;
          border: 1px solid #f8717130;
          border-radius: var(--radius-sm);
          padding: 10px 14px;
        }

        /* Upload success flash */
        .upload-success-panel {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          padding: 32px 20px; text-align: center;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
        }
        .success-icon {
          width: 48px; height: 48px; border-radius: 50%;
          background: rgba(52,211,153,0.15); color: #34d399;
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; margin-bottom: 8px;
        }
        .success-title { font-size: 18px; font-weight: 700; color: var(--text); margin: 0; }
        .success-sub { font-size: 14px; color: var(--text-muted); margin: 0 0 16px; }
        
        .room-code-box {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          padding: 12px 24px;
          background: var(--surface); border: 1px dashed var(--border-hover);
          border-radius: var(--radius-sm); width: 100%;
        }
        .room-code-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; }
        .room-code-val { font-size: 28px; font-weight: 800; color: var(--accent); letter-spacing: 0.15em; }
      `}</style>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="28"
        strokeDashoffset="10"
        strokeLinecap="round"
      />
    </svg>
  );
}