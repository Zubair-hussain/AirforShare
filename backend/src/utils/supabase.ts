import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Env } from '../types';

/**
 * Initialize Supabase client (OPTIONAL)
 * Controlled via ENABLE_SUPABASE env flag
 */
export function initializeSupabase(env: Env): SupabaseClient | null {
  const ENABLE_SUPABASE = env.ENABLE_SUPABASE === 'true';

  if (!ENABLE_SUPABASE) {
    return null; // 🔥 Completely disabled
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
    console.warn('⚠️ Supabase enabled but missing credentials.');
    return null;
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
    global: {
      headers: { Prefer: 'return=representation' },
    },
  });
}

/**
 * Store metadata in Supabase (BACKUP ONLY)
 */
export async function storeShareMetadataSupabase(
  supabaseClient: SupabaseClient | null,
  shareData: {
    id: string;
    room_code: string;
    type: 'file' | 'text';
    content?: string;
    file_name?: string;
    file_size?: number;
    file_size_original?: number;
    is_compressed?: boolean;
    ip_hash: string;
    room_id: string;
    expires_at: number;
    created_at: number;
  }
) {
  if (!supabaseClient) return null;

  try {
    const { data, error } = await supabaseClient
      .from('shares')
      .insert([shareData]);

    if (error) {
      console.error('❌ Supabase insert error:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Supabase insert failed:', error);
    return null;
  }
}

/**
 * Get metadata from Supabase (FALLBACK ONLY)
 */
export async function getShareMetadataSupabase(
  supabaseClient: SupabaseClient | null,
  roomCode: string
) {
  if (!supabaseClient) return null;

  try {
    const { data, error } = await supabaseClient
      .from('shares')
      .select('*')
      .eq('room_code', roomCode)
      .maybeSingle(); // 🔥 safer than single()

    if (error) {
      console.error('❌ Supabase select error:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Supabase fetch failed:', error);
    return null;
  }
}

/**
 * Upload file to Supabase Storage (NOT recommended for primary use)
 */
export async function uploadToSupabaseStorage(
  supabaseClient: SupabaseClient | null,
  bucketName: string,
  filePath: string,
  fileData: ArrayBuffer | Uint8Array,
  contentType: string
) {
  if (!supabaseClient) return null;

  try {
    const blob =
      fileData instanceof Uint8Array
        ? new Blob([fileData], { type: contentType })
        : new Blob([new Uint8Array(fileData)], { type: contentType });

    const { data, error } = await supabaseClient.storage
      .from(bucketName)
      .upload(filePath, blob, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error('❌ Supabase storage upload error:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Supabase storage failed:', error);
    return null;
  }
}

/**
 * Delete share from Supabase (cleanup / sync)
 */
export async function deleteShareSupabase(
  supabaseClient: SupabaseClient | null,
  shareId: string
) {
  if (!supabaseClient) return false;

  try {
    const { error } = await supabaseClient
      .from('shares')
      .delete()
      .eq('id', shareId);

    if (error) {
      console.error('❌ Supabase delete error:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Supabase delete failed:', error);
    return false;
  }
}