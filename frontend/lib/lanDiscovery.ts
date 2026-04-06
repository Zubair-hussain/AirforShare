// lib/lanDiscovery.ts
// ─────────────────────────────────────────────────────────────────────────────
// Gets the real LAN IP of the browser using WebRTC STUN
// This bypasses Cloudflare proxy — the browser talks directly to STUN server
// and reveals its actual local network IP (e.g., 192.168.1.5)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the device's real LAN IP address using WebRTC STUN.
 * Returns null if not on a local network or WebRTC not available.
 */
export async function getLanIp(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      const timeout = setTimeout(() => {
        pc.close();
        resolve(null);
      }, 3000); // 3s timeout

      pc.createDataChannel('');
      pc.createOffer().then((offer) => pc.setLocalDescription(offer));

      pc.onicecandidate = (e) => {
        if (!e.candidate) return;

        // Parse IP from ICE candidate string
        // Format: "candidate:... IP port ..."
        const ipMatch = e.candidate.candidate.match(
          /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/
        );

        if (ipMatch) {
          const ip = ipMatch[1];
          // Only care about private/LAN IPs
          if (isPrivateIp(ip)) {
            clearTimeout(timeout);
            pc.close();
            resolve(ip);
          }
        }
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Extract subnet from LAN IP (first 3 octets)
 * e.g., "192.168.1.105" → "192.168.1"
 */
export function getSubnetFromIp(ip: string): string | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  return parts.slice(0, 3).join('.');
}

/**
 * Check if IP is a private/LAN address
 */
export function isPrivateIp(ip: string): boolean {
  return (
    /^10\./.test(ip) ||
    /^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^127\./.test(ip)
  );
}

/**
 * Get the LAN subnet string for use as a Supabase Realtime channel name.
 * Returns null if not on a LAN.
 * e.g., "192.168.1" → channel name: "lan-192.168.1"
 */
export async function getLanChannel(): Promise<string | null> {
  const ip = await getLanIp();
  if (!ip) return null;
  const subnet = getSubnetFromIp(ip);
  if (!subnet) return null;
  return `lan-${subnet}`;
}