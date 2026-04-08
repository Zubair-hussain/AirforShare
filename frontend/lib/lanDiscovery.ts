// lib/lanDiscovery.ts
// ─────────────────────────────────────────────────────────────────────────────
// Replaced WebRTC STUN with backend-based Public IP hashing.
// This resolves the issue where modern browsers block local IP leakage via WebRTC,
// and ensures users on the exact same WiFi (sharing public IP) can auto-discover 
// each other seamlessly without browser warnings or blocks.
// ─────────────────────────────────────────────────────────────────────────────

import { getNetworkId } from './api';

/**
 * Get the securely hashed Network ID for the current device's public IP.
 * Devices sharing a WiFi connection will have identical public IPs, 
 * and therefore identical Network IDs.
 */
export async function getLanIp(): Promise<string | null> {
  // We keep the old function name for compatibility, 
  // but it now returns the "Network ID" rather than a local IP like 192.168.1.5
  return getNetworkId();
}

/**
 * Extract subnet from IP (Legacy wrapper)
 * Since we now use a hashed Network ID, we just return the ID directly
 * because the entire ID represents the "subnet" (the exact public IP).
 */
export function getSubnetFromIp(ip: string): string | null {
  return ip || null;
}

/**
 * Legacy check. Since we are using public IPs via the backend now,
 * we consider any valid Network ID as a "private" match for our purposes.
 */
export function isPrivateIp(ip: string): boolean {
  return !!ip;
}

/**
 * Get the channel string for use as a Supabase Realtime channel name.
 * e.g., Network ID "abcd123" → channel name: "lan-abcd123"
 */
export async function getLanChannel(): Promise<string | null> {
  const ip = await getLanIp();
  if (!ip) return null;
  return `lan-${ip}`;
}