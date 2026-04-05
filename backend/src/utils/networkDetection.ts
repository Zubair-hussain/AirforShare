import { NetworkInfo } from '../types';

/**
 * Extract user's IP address from request headers
 * Handles Cloudflare Workers, ngrok, and direct connections
 */
export function getUserIp(headers: Headers): string {
  // Cloudflare specific header (most reliable in production)
  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();

  // ngrok and reverse proxies send X-Forwarded-For
  // Format: "client, proxy1, proxy2" — we want the first (original client)
  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',').map((ip) => ip.trim());
    // Find the first non-ngrok/non-proxy IP
    for (const ip of ips) {
      if (ip && ip !== 'unknown') return ip;
    }
  }

  const xRealIp = headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();

  // Fallback: treat as unknown (don't block, just mark as non-local)
  return 'unknown';
}

/**
 * Detect if IP is from local/private network
 * RFC1918 private ranges + loopback + link-local
 */
export function isPrivateNetwork(ip: string): boolean {
  if (!ip || ip === 'unknown') return false;

  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^192\.168\./,
    /^127\./,
    /^169\.254\./,   // IPv4 link-local
    /^::1$/,          // IPv6 loopback
    /^fe80:/i,        // IPv6 link-local
    /^fc00:/i,        // IPv6 unique local
    /^fd[0-9a-f]{2}:/i, // IPv6 unique local
  ];

  return privateRanges.some((range) => range.test(ip));
}

/**
 * Get subnet from IP (for grouping users on same LAN)
 * Returns null for public IPs — they can still use the app, just not "local" features
 */
export function getSubnet(ip: string): string | null {
  if (!isPrivateNetwork(ip)) return null;

  const parts = ip.split('.');
  if (parts.length !== 4) return null;

  // First 3 octets = subnet (e.g., "192.168.1")
  return parts.slice(0, 3).join('.');
}

/**
 * Analyze network information from request headers
 * 
 * IMPORTANT: When using ngrok, users will appear as public IPs.
 * isLocalNetwork = false via ngrok is EXPECTED and correct.
 * The app should still work — only local-network-specific features are affected.
 */
export function analyzeNetwork(headers: Headers): NetworkInfo {
  const userIp = getUserIp(headers);
  const isLocalNetwork = isPrivateNetwork(userIp);
  const subnet = isLocalNetwork ? getSubnet(userIp) : undefined;

  return {
    userIp,
    isLocalNetwork,
    subnet: subnet ?? undefined,
  };
}

/**
 * Check if two users are on the same local subnet
 */
export function sameLocalNetwork(ip1: string, ip2: string): boolean {
  if (!isPrivateNetwork(ip1) || !isPrivateNetwork(ip2)) return false;

  const subnet1 = getSubnet(ip1);
  const subnet2 = getSubnet(ip2);

  return subnet1 !== null && subnet1 === subnet2;
}