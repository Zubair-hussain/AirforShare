// lib/supabaseRealtime.ts
// ─────────────────────────────────────────────────────────────────────────────
// Handles Supabase Realtime for LAN-based auto-discovery
// Broadcaster: uploader announces share to subnet channel
// Subscriber: any device on same subnet receives it instantly
// ─────────────────────────────────────────────────────────────────────────────

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _client;
}

export interface LocalShare {
  id?: string;
  subnet: string;
  room_code: string;
  share_id: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  is_compressed?: boolean;
  file_size_original?: number;
  type: 'file' | 'text';
  expires_at: number;
  created_at?: number;
}

// ── Broadcast a share to the local subnet channel ────────────────────────────
export async function broadcastLocalShare(
  share: Omit<LocalShare, 'id' | 'created_at'>
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    // 1. Insert into local_broadcasts table (persisted, for late joiners)
    const { error } = await supabase.from('local_broadcasts').insert([
      {
        ...share,
        created_at: Date.now(),
      },
    ]);

    if (error) {
      console.error('LAN broadcast insert error:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('LAN broadcast failed:', err);
    return false;
  }
}

// ── Subscribe to LAN shares on a subnet channel ──────────────────────────────
export function subscribeLanShares(
  subnet: string,
  onShare: (share: LocalShare) => void
): RealtimeChannel | null {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const channel = supabase
    .channel(`lan-${subnet}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'local_broadcasts',
        filter: `subnet=eq.${subnet}`,
      },
      (payload) => {
        const share = payload.new as LocalShare;
        // Only show non-expired shares
        if (Date.now() < share.expires_at) {
          onShare(share);
        }
      }
    )
    .subscribe();

  return channel;
}

// ── Fetch existing LAN shares (for when user first opens the app) ────────────
export async function fetchExistingLanShares(
  subnet: string
): Promise<LocalShare[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('local_broadcasts')
      .select('*')
      .eq('subnet', subnet)
      .gt('expires_at', Date.now())
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('LAN fetch error:', error.message);
      return [];
    }

    return (data as LocalShare[]) || [];
  } catch {
    return [];
  }
}

// ── Unsubscribe from channel ─────────────────────────────────────────────────
export function unsubscribeLanShares(channel: RealtimeChannel | null) {
  if (!channel) return;
  const supabase = getSupabaseClient();
  supabase?.removeChannel(channel);
}