'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // ✅ added
import { shareText } from '../lib/api';

export default function TextShare() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter(); // ✅ added

  const MAX = 10_000;
  const remaining = MAX - content.length;

  const submit = async () => {
    if (!content.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await shareText(content.trim());

      // 🔥 AUTO REDIRECT (MAIN FIX)
      router.push(`/room/${res.roomCode}`);

    } catch (err: any) {
      setError(err.message || 'Failed to share text');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section">
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