const API_URL = process.env.NEXT_PUBLIC_API_URL;

// ── Get Cluster Session Logic ─────────────────────────────────────────
export async function getClusterSession(): Promise<{ sessionId: string } | null> {
  try {
    const res = await fetch(`${API_URL}/room/session`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch cluster session:', err);
    return null;
  }
}

export interface ShareInfo {
  roomCode: string;
  type: 'file' | 'text';
  fileName?: string;
  fileSize?: number;
  fileSizeOriginal?: number;
  isCompressed?: boolean;
  fileType?: string;
  content?: string;
  expiresAt: number;
  createdAt: number;
  isLocalNetworkShare?: boolean;
  requesterIsLocal?: boolean;
  sameNetwork?: boolean;
  message?: string;
}

export interface UploadResult {
  success: boolean;
  roomCode: string;
  shareId: string;
  fileName: string;
  fileSize: number;
  fileSizeOriginal?: number;
  isCompressed?: boolean;
  compressionRatio?: string;
  expiresAt: number;
  downloadUrl: string;
  isLocalNetwork?: boolean;
  message?: string;
}

export interface TextShareResult {
  success: boolean;
  roomCode: string;
  shareId: string;
  expiresAt: number;
}

// ── Upload a file (with optional Turnstile token) ───────────────────
export async function uploadFile(
  file: File,
  onProgress?: (percent: number) => void,
  turnstileToken?: string
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    // Attach Turnstile token if provided
    if (turnstileToken) {
      formData.append('cf-turnstile-response', turnstileToken);
    }

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      let data: any;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error('Invalid response from server'));
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        reject(new Error(data.error || 'Upload failed'));
      }
    });

    xhr.addEventListener('error', () =>
      reject(new Error('Network error during upload'))
    );

    xhr.open('POST', `${API_URL}/upload`);
    xhr.send(formData);
  });
}

// ── Share text / link (with optional Turnstile token) ───────────────
export async function shareText(
  content: string,
  turnstileToken?: string
): Promise<TextShareResult> {
  const res = await fetch(`${API_URL}/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
      ...(turnstileToken ? { 'cf-turnstile-response': turnstileToken } : {}),
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to create text share');
  }

  return data;
}

// ── Get room info ─────────────────────────────────────────────────────
export async function getRoomInfo(roomCode: string): Promise<ShareInfo> {
  const res = await fetch(`${API_URL}/room/${roomCode}`);
  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.error || 'Room not found') as Error & {
      expired?: boolean;
    };
    if (data.expired) err.expired = true;
    throw err;
  }

  const room = data.data || data;

  return {
    roomCode: room.roomCode,
    type: room.type,
    fileName: room.fileName,
    fileSize: room.fileSize,
    fileSizeOriginal: room.fileSizeOriginal,
    isCompressed: room.isCompressed,
    fileType: room.fileType,
    content: room.content,
    expiresAt: room.expiresAt,
    createdAt: room.createdAt,
    isLocalNetworkShare: room.isLocalNetworkShare,
    requesterIsLocal: room.requesterIsLocal,
    sameNetwork: room.sameNetwork,
    message: room.message,
  };
}

// ── Get text content by shareId ──────────────────────────────────────
export async function getTextContent(shareId: string): Promise<any> {
  const res = await fetch(`${API_URL}/text/${shareId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch text content');
  return data;
}

// ── Get file metadata by shareId ─────────────────────────────────────
export async function getFileMetadata(shareId: string): Promise<any> {
  const res = await fetch(`${API_URL}/upload/${shareId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch file metadata');
  return data;
}

// ── Download URL ─────────────────────────────────────────────────────
export function getDownloadUrl(roomCode: string): string {
  return `${API_URL}/download/${roomCode}`;
}

// ── Format file size ─────────────────────────────────────────────────
export function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ── Format time remaining ────────────────────────────────────────────
export function formatTimeRemaining(expiresAt: number): string {
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return 'Expired';
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ── Shareable link ───────────────────────────────────────────────────
export function buildShareLink(roomCode: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/room/${roomCode}`;
}