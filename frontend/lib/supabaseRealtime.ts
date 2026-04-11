// lib/supabaseRealtime.ts
// ─────────────────────────────────────────────────────────────────────────────
// Handles Supabase Realtime for Cluster-based session sharing
// ─────────────────────────────────────────────────────────────────────────────

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    if (typeof window !== 'undefined') {
      console.warn('Supabase credentials missing. Real-time sharing will be disabled.');
    }
    return null;
  }
  
  if (!_client) {
    try {
      _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (err) {
      console.error('Failed to create Supabase client:', err);
      return null;
    }
  }
  return _client;
}

export interface ClusterShare {
  id: string;
  roomCode: string; // CamelCase from broadcast payload
  type: 'file' | 'text';
  file_name?: string;
  file_size?: number;
  file_type?: string;
  content?: string;
  expires_at: number;
  created_at: number;
}

/**
 * Subscribe to a Cluster Session
 * Listens for broadcasts and presence changes
 */
export function subscribeToCluster(
  clusterId: string,
  callbacks: {
    onNewShare: (share: any) => void;
    onPresenceSync: (count: number) => void;
  }
): RealtimeChannel | null {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const channel = supabase.channel(clusterId, {
    config: {
      presence: {
        key: 'user-' + Math.random().toString(36).substring(2, 7),
      },
    },
  });

  channel
    .on('broadcast', { event: 'new_share' }, (payload) => {
      console.log('Realtime share received:', payload);
      callbacks.onNewShare(payload.payload);
    })
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      callbacks.onPresenceSync(Object.keys(state).length);
    })
    .on('presence', { event: 'join' }, ({ newPresences }) => {
      console.log('User joined cluster:', newPresences);
    })
    .on('presence', { event: 'leave' }, ({ leftPresences }) => {
      console.log('User left cluster:', leftPresences);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ online_at: new Date().toISOString() });
      }
    });

  return channel;
}

/**
 * Fetch existing shares for the cluster from D1 via the standard room API
 */
export async function fetchClusterShares(sessionId: string): Promise<any[]> {
  // Since we don't have a cluster-specific API in D1 yet, we might rely on 
  // the initial load or a specific discovery endpoint.
  // For now, we'll keep it as a placeholder or use the room discovery if available.
  return [];
}

export function unsubscribeFromCluster(channel: RealtimeChannel | null) {
  if (!channel) return;
  const supabase = getSupabaseClient();
  supabase?.removeChannel(channel);
}