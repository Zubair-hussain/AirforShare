'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { uploadFile, UploadResult, formatFileSize } from '../lib/api';
import dynamic from 'next/dynamic';

// Load Turnstile only on client — never SSR (prevents hydration errors 418/423/425)
const Turnstile = dynamic(() => import('./Turnstile'), { ssr: false });

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

// Set your Turnstile site key in .env.local:
// NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_key_here
// Use "1x00000000000000000000AA" for testing (always passes)
const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

export default function FileUploader({ roomId }: { roomId: string }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileExpired, setTurnstileExpired] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    setDragging(e.type === 'dragover' || e.type === 'dragenter');
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSet(dropped);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) validateAndSet(picked);
  };

  const validateAndSet = (f: File) => {
    setError('');
    setUploadResult(null);
    if (f.size === 0) {
      setError(`File is empty. Please select a valid file.`);
      return;
    }
    if (f.size > MAX_SIZE) {
      setError(`File too large. Maximum size is 10MB. Your file: ${formatFileSize(f.size)}`);
      return;
    }
    setFile(f);
  };

  const doUpload = async () => {
    if (!file) return;

    // Block upload if Turnstile hasn't been solved
    if (!turnstileToken || turnstileExpired) {
      setError('Please complete the security check before uploading.');
      return;
    }

    setUploading(true);
    setProgress(0);
    setError('');

    try {
      const res: UploadResult = await uploadFile(file, setProgress, roomId, turnstileToken);
      setUploadResult(res);

      // ── LOCAL STORAGE FALLBACK ──────────────────────────────────────
      const sharePayload = {
        subnet: 'native',
        room_code: res.roomCode,
        share_id: res.shareId,
        file_name: res.fileName,
        file_size: res.fileSize,
        file_size_original: res.fileSizeOriginal,
        is_compressed: res.isCompressed,
        file_type: file.type,
        type: 'file' as const,
        expires_at: res.expiresAt,
      };
      try { localStorage.setItem('afs_recent_share', JSON.stringify(sharePayload)); } catch {}
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      setUploading(false);
      // Reset turnstile on failure so user can try again
      setTurnstileToken(null);
      setTurnstileExpired(false);
    }
  };

  const reset = () => {
    setFile(null);
    setError('');
    setProgress(0);
    setUploadResult(null);
    setTurnstileToken(null);
    setTurnstileExpired(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const canUpload = file && !uploading && !uploadResult && !!turnstileToken && !turnstileExpired;

  return (
    <>
      <div className="section">
        <input
          ref={inputRef}
          type="file"
          id="file-input"
          style={{ display: 'none' }}
          onChange={handleChange}
        />

        {/* Drop Zone */}
        <label
          htmlFor="file-input"
          className={`dropzone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          {file ? (
            <div className="file-preview">
              <FileIcon type={file.type} />
              <div className="file-info">
                <p className="file-name">{file.name}</p>
                <p className="file-size">{formatFileSize(file.size)}</p>
              </div>
              <button
                className="remove-btn"
                onClick={(e) => { e.preventDefault(); reset(); }}
                title="Remove file"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="drop-idle">
              <div className="drop-icon">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path
                    d="M14 4v14M8 10l6-6 6 6"
                    stroke="var(--accent)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M5 21v1a2 2 0 002 2h14a2 2 0 002-2v-1"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeOpacity="0.4"
                  />
                </svg>
              </div>
              <p className="drop-text">Drop your file here</p>
              <p className="drop-sub">
                or <span className="drop-browse">browse files</span> · max 10MB
              </p>
            </div>
          )}
        </label>

        {/* Progress bar */}
        {uploading && (
          <div className="progress-wrap">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="progress-label mono">{progress}%</span>
          </div>
        )}

        {/* Upload result flash */}
        {uploadResult && (
          <div className="upload-success-panel animate-in">
            <div className="success-icon">✓</div>
            <p className="success-title">File shared!</p>
            <p className="success-sub">
              <strong style={{ color: 'var(--accent)' }}>{uploadResult.fileName}</strong><br/>
              is now visible to everyone on your WiFi.<br/>
              They'll see it automatically — no code needed.
            </p>
            <button className="btn-ghost" onClick={reset} style={{ marginTop: 16, width: '100%' }}>
              Share another file
            </button>
          </div>
        )}

        {/* Error */}
        {error && <p className="error-msg">{error}</p>}

        {/* ── Cloudflare Turnstile ── */}
        {file && !uploading && !uploadResult && (
          <div className="turnstile-wrap">
            <p className="turnstile-label">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
                <path
                  d="M6.5 1a5.5 5.5 0 100 11A5.5 5.5 0 006.5 1zm0 3v2.5L8 8"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Security check
            </p>
            <Turnstile
              siteKey={TURNSTILE_SITE_KEY}
              theme="auto"
              size="normal"
              onSuccess={(token) => {
                setTurnstileToken(token);
                setTurnstileExpired(false);
                setError('');
              }}
              onError={() => {
                setTurnstileToken(null);
                setError('Security check failed. Please refresh and try again.');
              }}
              onExpire={() => {
                setTurnstileToken(null);
                setTurnstileExpired(true);
                setError('Security check expired. Please verify again.');
              }}
            />
            {turnstileToken && !turnstileExpired && (
              <p className="turnstile-ok">✓ Verified</p>
            )}
          </div>
        )}

        {/* Upload button */}
        {file && !uploading && !uploadResult && (
          <button
            className={`btn-primary upload-btn animate-in ${!canUpload ? 'btn-disabled' : ''}`}
            onClick={doUpload}
            disabled={!canUpload}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 2v9M4 7l4-4 4 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {turnstileToken ? 'Drop File' : 'Complete security check'}
          </button>
        )}
      </div>

      <FileUploaderStyle />
    </>
  );
}

function FileUploaderStyle() {
  return (
    <style>{`
      .section { display: flex; flex-direction: column; gap: 14px; }
      .dropzone {
        display: block;
        border: 1.5px dashed rgba(255,255,255,0.1);
        border-radius: var(--radius);
        padding: 44px 24px;
        cursor: pointer;
        transition: all var(--transition);
        text-align: center;
      }
      .dropzone:hover, .dropzone.dragging {
        border-color: var(--accent);
        background: rgba(0,229,160,0.03);
      }
      .dropzone.has-file {
        border-style: solid;
        border-color: var(--border-hover);
        padding: 18px 20px;
      }
      .drop-icon {
        width: 64px; height: 64px;
        border-radius: 18px;
        background: var(--surface2);
        border: 1px solid var(--border);
        display: flex; align-items: center; justify-content: center;
        margin: 0 auto 14px;
        transition: all var(--transition);
      }
      .dropzone:hover .drop-icon {
        background: rgba(0,229,160,0.08);
        border-color: rgba(0,229,160,0.3);
      }
      .drop-text { font-size: 16px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
      .drop-sub  { font-size: 13px; color: var(--text-muted); line-height: 1.5; }
      .drop-browse { color: var(--accent); font-weight: 600; }
      .file-preview { display: flex; align-items: center; gap: 14px; text-align: left; }
      .file-info { flex: 1; min-width: 0; }
      .file-name {
        font-size: 14px; font-weight: 600; color: var(--text);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .file-size {
        font-size: 12px; color: var(--text-muted);
        font-family: "JetBrains Mono", monospace; margin-top: 2px;
      }
      .remove-btn {
        width: 28px; height: 28px; border-radius: 50%;
        background: var(--surface2); border: 1px solid var(--border);
        color: var(--text-muted); font-size: 18px;
        display: flex; align-items: center; justify-content: center;
        transition: all var(--transition); flex-shrink: 0;
      }
      .remove-btn:hover { background: var(--danger); border-color: var(--danger); color: white; }
      .progress-wrap { display: flex; align-items: center; gap: 12px; }
      .progress-bar {
        flex: 1; height: 3px;
        background: var(--surface2); border-radius: 99px; overflow: hidden;
      }
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--accent), #00c8ff);
        border-radius: 99px; transition: width 200ms ease;
      }
      .progress-label { font-size: 12px; color: var(--text-muted); min-width: 36px; font-family: "JetBrains Mono", monospace; }
      .turnstile-wrap {
        display: flex; flex-direction: column; align-items: center; gap: 8px;
        padding: 14px 16px;
        background: var(--surface2);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
      }
      .turnstile-label {
        display: flex; align-items: center; gap: 5px;
        font-size: 11px; font-weight: 600;
        color: var(--text-muted);
        letter-spacing: 0.05em; text-transform: uppercase;
        margin: 0 0 4px;
      }
      .turnstile-ok { font-size: 12px; font-weight: 700; color: var(--accent); margin: 0; }
      .error-msg {
        font-size: 13px; color: var(--danger);
        background: rgba(255,77,106,0.06); border: 1px solid rgba(255,77,106,0.2);
        border-radius: var(--radius-sm); padding: 10px 14px;
      }
      .upload-btn { width: 100%; }
      .btn-disabled { opacity: 0.4; cursor: not-allowed; }
    `}</style>
  );
}

function FileIcon({ type }: { type: string }) {
  const isImage = type.startsWith('image/');
  const isPdf = type === 'application/pdf';
  const isVideo = type.startsWith('video/');
  const isAudio = type.startsWith('audio/');

  let color = 'var(--accent2)';
  let label = 'FILE';
  if (isImage) { color = 'var(--accent)'; label = 'IMG'; }
  if (isPdf) { color = 'var(--danger)'; label = 'PDF'; }
  if (isVideo) { color = 'var(--accent2)'; label = 'VID'; }
  if (isAudio) { color = 'var(--warning)'; label = 'AUD'; }

  return (
    <div style={{
      width: 44, height: 44, borderRadius: 10,
      background: `${color}18`, border: `1px solid ${color}40`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
      fontWeight: 700, color, flexShrink: 0,
    }}>
      {label}
    </div>
  );
}