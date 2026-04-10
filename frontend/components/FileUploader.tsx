'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { uploadFile, UploadResult, formatFileSize } from '../lib/api';
import dynamic from 'next/dynamic';
import { getLanIp, getSubnetFromIp } from '../lib/lanDiscovery';

// Load Turnstile only on client — never SSR (prevents hydration errors 418/423/425)
const Turnstile = dynamic(() => import('./Turnstile'), { ssr: false });

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

// Set your Turnstile site key in .env.local:
// NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_key_here
// Use "1x00000000000000000000AA" for testing (always passes)
const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

export default function FileUploader() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileExpired, setTurnstileExpired] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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
    if (f.size > MAX_SIZE) {
      setError(`File too large. Maximum size is 50MB. Your file: ${formatFileSize(f.size)}`);
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
      const res: UploadResult = await uploadFile(file, setProgress, turnstileToken);
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
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path
                    d="M16 4v16M10 10l6-6 6 6"
                    stroke="var(--accent)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6 22v2a2 2 0 002 2h16a2 2 0 002-2v-2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeOpacity="0.4"
                  />
                </svg>
              </div>
              <p className="drop-text">Drop your file here</p>
              <p className="drop-sub">
                or <span className="drop-browse">browse files</span> · max 50MB
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
            <p className="success-title">Shared successfully!</p>
            <p className="success-sub">
              Your file is now available on your WiFi network.
            </p>
            <div className="room-code-box">
              <span className="room-code-label">Remote Share Code</span>
              <span className="room-code-val mono">{uploadResult.roomCode}</span>
            </div>
            
            <button className="btn-ghost" onClick={reset} style={{ marginTop: 16, width: '100%' }}>
              Upload another file
            </button>
          </div>
        )}

        {/* Error */}
        {error && <p className="error-msg">{error}</p>}

        {/* ── Cloudflare Turnstile ── */}
        {/* Show once a file is selected and we haven't uploaded yet */}
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
              Security check — powered by Cloudflare
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
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M9 2v10M4 7l5-5 5 5"
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
            {turnstileToken ? 'Upload & Get Code' : 'Complete check above first'}
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
      .section { display: flex; flex-direction: column; gap: 16px; }
      .dropzone {
        display: block;
        border: 1.5px dashed var(--border-hover);
        border-radius: var(--radius);
        padding: 48px 24px;
        cursor: pointer;
        transition: all var(--transition);
        text-align: center;
      }
      .dropzone:hover, .dropzone.dragging {
        border-color: var(--accent);
        background: var(--accent-glow);
      }
      .dropzone.has-file {
        border-style: solid;
        border-color: var(--border);
        padding: 20px 24px;
      }
      .drop-icon {
        width: 72px; height: 72px;
        border-radius: 20px;
        background: var(--surface2);
        border: 1px solid var(--border);
        display: flex; align-items: center; justify-content: center;
        margin: 0 auto 16px;
        transition: all var(--transition);
      }
      .dropzone:hover .drop-icon {
        background: var(--accent-glow);
        border-color: var(--accent);
      }
      .drop-text { font-size: 17px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
      .drop-sub { font-size: 13px; color: var(--text-muted); }
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
        flex: 1; height: 4px;
        background: var(--surface2); border-radius: 99px; overflow: hidden;
      }
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--accent), var(--accent2));
        border-radius: 99px; transition: width 200ms ease;
      }
      .progress-label { font-size: 12px; color: var(--text-muted); min-width: 36px; }

      /* Turnstile wrapper */
      .turnstile-wrap {
        display: flex; flex-direction: column; align-items: center; gap: 8px;
        padding: 16px;
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
      .turnstile-ok {
        font-size: 12px; font-weight: 700;
        color: #34d399; margin: 0;
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

      .error-msg {
        font-size: 13px; color: var(--danger);
        background: #f8717115; border: 1px solid #f8717130;
        border-radius: var(--radius-sm); padding: 10px 14px;
      }
      .upload-btn { width: 100%; }
      .btn-disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
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
  if (isImage) { color = '#34d399'; label = 'IMG'; }
  if (isPdf) { color = '#f87171'; label = 'PDF'; }
  if (isVideo) { color = '#a78bfa'; label = 'VID'; }
  if (isAudio) { color = '#fbbf24'; label = 'AUD'; }

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