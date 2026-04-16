export interface Env {
  R2: R2Bucket;
  DB: D1Database;
  MAX_FILE_SIZE: string;
  ROOM_EXPIRY_MINUTES: string;
  FRONTEND_URL: string;
  
  // Supabase configuration
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
  
  // Cloudflare Workers configuration
  COMPRESSION_THRESHOLD: string; // File size threshold for compression (in bytes)
}

export interface Share {
  id: string;
  room_code: string;
  type: 'file' | 'text';
  content?: string;
  file_key?: string;
  file_name?: string;
  file_size?: number;
  file_size_original?: number; // Size before compression
  file_type?: string;
  is_compressed?: boolean;
  expires_at: number;
  created_at: number;
  ip_hash: string;
  room_id: string;
}

export interface NetworkInfo {
  userIp: string;
  isLocalNetwork: boolean;
  subnet?: string;
}

export interface CompressionMetadata {
  compressed: boolean;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  algorithm: 'gzip' | 'none';
}
