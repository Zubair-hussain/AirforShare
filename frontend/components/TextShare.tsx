'use client';

import { useState } from 'react';
import { shareText } from '../lib/api';

export default function TextShare({ roomId }: { roomId: string }) {
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
      const res = await shareText(content.trim(), roomId);

      try {
        const sharePayload = {
          subnet: 'native',
          room_code: res.roomCode,
          share_id: res.shareId,
          file_type: 'text/plain',
          type: 'text' as const,
          expires_at: res.expiresAt,
        };
        localStorage.setItem('afs_recent_share', JSON.stringify(sharePayload));
      } catch (e) {
        console.error('Local fallback skipped', e);
      }

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
          <p className="success-title">Text shared!</p>
          <p className="success-sub">
            Your text is now visible to everyone on your WiFi.<br/>
            They'll see it automatically &mdash; no code needed.
          </p>
          <button className="btn-ghost" onClick={() => setUploadResult(null)} style={{ marginTop: 16, width: '100%' }}>
            Share more text
          </button>
        </div>
      ) : (
        <>
          <div className="textarea-wrap">
            <textarea
              className="text-input"
              placeholder="Paste text, links, or code here..."
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
            className={`btn-primary ${!content.trim() || loading ? 'btn-disabled' : ''}`}
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
                    d="M3 8h10M9 3l5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Drop Text
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
          background: rgba(0,229,160,0.02);
        }
        .text-input::placeholder { color: var(--text-muted); opacity: 0.5; }
        .char-count {
          position: absolute;
          bottom: 10px;
          right: 12px;
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          color: var(--text-muted);
          opacity: 0.6;
        }
        .char-count.warn { color: var(--warning); opacity: 1; }
        .error-msg {
          font-size: 13px; color: var(--danger);
          background: rgba(255,77,106,0.06); border: 1px solid rgba(255,77,106,0.2);
          border-radius: var(--radius-sm); padding: 10px 14px;
        }
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