import { Env, Share } from '../types';

/**
 * Deletes all expired shares from D1 and their files from R2.
 * Also cleans up expired local_broadcasts rows.
 * Called by Cloudflare Cron Trigger every 30 minutes.
 */
export async function cleanupExpiredShares(env: Env): Promise<{ deleted: number }> {
  const now = Date.now();

  // Find expired shares
  const { results } = await env.DB.prepare(
    'SELECT * FROM shares WHERE expires_at < ?'
  ).bind(now).all<Share>();

  let deleted = 0;

  if (results && results.length > 0) {
    for (const share of results) {
      try {
        // Delete file from R2 if it exists
        if (share.file_key) {
          await env.R2.delete(share.file_key);
        }
        // Delete record from D1
        await env.DB.prepare('DELETE FROM shares WHERE id = ?').bind(share.id).run();
        deleted++;
      } catch (err) {
        console.error(`Failed to delete share ${share.id}:`, err);
      }
    }
  }

  // Also clean expired local_broadcasts
  try {
    await env.DB.prepare('DELETE FROM local_broadcasts WHERE expires_at < ?').bind(now).run();
  } catch (err) {
    console.error('Failed to clean local_broadcasts:', err);
  }

  console.log(`Cleanup complete: deleted ${deleted} expired shares`);
  return { deleted };
}
