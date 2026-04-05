/**
 * Generates a cryptographically random 6-digit numeric room code.
 * Uses Web Crypto API — works natively in Cloudflare Workers.
 */
export function generateRoomCode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  // Map to 100000–999999 range (guaranteed 6 digits)
  const code = 100000 + (array[0] % 900000);
  return code.toString();
}

/**
 * Generates a unique share ID (UUID v4 style via Web Crypto)
 */
export function generateId(): string {
  return crypto.randomUUID();
}
