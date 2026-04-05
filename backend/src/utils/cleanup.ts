import { Env, Share } from '../types';

/**
 * Deletes all expired shares from D1 and their files from R2.
 * Called by Cloudflare Cron Trigger every 30 minutes.
 */
export async function cleanupExpiredShares(env: Env): Promise<{ deleted: number }> {
  const now = Date.now();

  // Find expired shares
  const { results } = await env.DB.prepare(
    'SELECT * FROM shares WHERE expires_at < ?'
  ).bind(now).all<Share>();

  if (!results || results.length === 0) {
    return { deleted: 0 };
  }

  let deleted = 0;

  for (const share of results) {
    try {
      // Delete file from R2 if it exists
      if (share.file_key) {
        await env.R2.delete(share.file_key);
      }

      // Delete record from D1
      await env.DB.prepare(
        'DELETE FROM shares WHERE id = ?'
      ).bind(share.id).run();

      deleted++;
    } catch (err) {
      console.error(`Failed to delete share ${share.id}:`, err);
    }
  }

  console.log(`Cleanup complete: deleted ${deleted} expired shares`);
  return { deleted };
}
