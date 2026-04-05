'use client';

import { useState } from 'react';
import { ShareInfo, getDownloadUrl, formatFileSize } from '../lib/api';
import Timer from './Timer';

interface FileReceiverProps {
  info: ShareInfo;
  onExpired: () => void;
}

export default function FileReceiver({ info, onExpired }: FileReceiverProps) {
  const [downloading, setDownloading] = useState(false);
  const downloadUrl = getDownloadUrl(info.roomCode);

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => setDownloading(false), 2000);
  };

  const savedBytes =
    info.isCompressed && info.fileSizeOriginal && info.fileSize
      ? info.fileSizeOriginal - info.fileSize
      : 0;

  const compressionRatio =
    info.isCompressed && info.fileSizeOriginal && info.fileSize
      ? ((savedBytes / info.fileSizeOriginal) * 100).toFixed(0)
      : null;

  return (
    <div className="receiver animate-in">

      {/* Same-network badge — only shown when both users are on LAN */}
      {info.sameNetwork && (
        <div className="network-badge">
          <span className="badge-dot" />
          <span>⚡ Same WiFi — optimized transfer</span>
        </div>
      )}

      {/* File card */}
      <div className="file-card">
        <div className="file-icon-lg">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path
              d="M7 4h10l6 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z"
              stroke="var(--accent)"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M17 4v6h6"
              stroke="var(--accent)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.5"
            />
          </svg>
        </div>

        <div className="file-details">
          <p className="file-name-lg">{info.fileName}</p>
          <p className="file-meta">
            {info.fileSize != null ? formatFileSize(info.fileSize) : 'Unknown size'}
            {info.fileSizeOriginal && info.isCompressed && (
              <span className="original-size">
                {' '}(was {formatFileSize(info.fileSizeOriginal)})
              </span>
            )}
            {info.fileType &&
              ` · ${info.fileType.split('/')[1]?.toUpperCase() ?? info.fileType}`}
          </p>

          {/* Compression pill */}
          {compressionRatio && (
            <div className="compress-pill">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path
                  d="M5.5 1v4M3 3.5l2.5-2.5L8 3.5M2 7.5h7M3.5 9.5h4"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {compressionRatio}% smaller
            </div>
          )}
        </div>
      </div>

      {/* Download button */}
      <a
        href={downloadUrl}
        download={info.fileName}
        className={`btn-primary download-btn ${downloading ? 'loading' : ''}`}
        onClick={handleDownload}
      >
        {downloading ? (
          <>
            <Spinner />
            Starting download...
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M9 3v9M5 8l4 4 4-4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M3 14v1a1 1 0 001 1h10a1 1 0 001-1v-1"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Download File
          </>
        )}
      </a>

      {/* Timer */}
      <div className="timer-row">
        <span className="timer-label">Expires in</span>
        <Timer expiresAt={info.expiresAt} onExpired={onExpired} />
      </div>

      <style>{`
        .receiver {
          display: flex;
          flex-direction: column;
          gap: 20px;
          align-items: center;
          width: 100%;
        }

        /* Same-network badge */
        .network-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: rgba(52, 211, 153, 0.08);
          border: 1px solid rgba(52, 211, 153, 0.3);
          border-radius: 99px;
          font-size: 12px;
          font-weight: 600;
          color: #34d399;
          width: 100%;
          justify-content: center;
        }
        .badge-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #34d399;
          animation: pulse-dot 1.8s ease-in-out infinite;
          flex-shrink: 0;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.75); }
        }

        .file-card {
          display: flex;
          align-items: center;
          gap: 16px;
          width: 100%;
          padding: 20px;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
        }
        .file-icon-lg {
          width: 60px;
          height: 60px;
          border-radius: 14px;
          background: var(--accent-glow);
          border: 1px solid var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .file-details { flex: 1; min-width: 0; }
        .file-name-lg {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          word-break: break-all;
        }
        .file-meta {
          font-size: 12px;
          color: var(--text-muted);
          font-family: 'JetBrains Mono', monospace;
          margin-top: 4px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .original-size {
          opacity: 0.6;
          text-decoration: line-through;
        }

        /* Compression pill */
        .compress-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 6px;
          padding: 3px 8px;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.25);
          border-radius: 99px;
          font-size: 11px;
          font-weight: 600;
          color: var(--accent2, #6366f1);
          letter-spacing: 0.02em;
        }

        .download-btn { width: 100%; }
        .timer-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }
        .timer-label { color: var(--text-subtle); }
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