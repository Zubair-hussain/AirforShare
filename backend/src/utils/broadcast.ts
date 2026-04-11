import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Broadcast an event to a Supabase Realtime channel
 */
export async function broadcastEvent(
  supabase: SupabaseClient | null,
  channelName: string,
  event: string,
  payload: any
) {
  if (!supabase) return;

  try {
    // We use the REST API to broadcast since Workers can't keep an open WebSocket connection
    // Supabase Realtime allows broadcasting via a POST to /realtime/v1/broadcast
    // However, the simplest way is often to use the channel.send() if using the JS client
    // but the JS client might try to open a WebSocket.
    
    // Better: Supabase Realtime Broadcast via HTTP
    // https://supabase.com/docs/guides/realtime/broadcast#broadcasting-from-the-server
    
    const channel = supabase.channel(channelName);
    await channel.send({
      type: 'broadcast',
      event: event,
      payload: payload,
    });
    
    // Note: channel.send returns a promise that resolves when the broadcast is SENT.
  } catch (err) {
    console.error('Failed to broadcast event:', err);
  }
}
