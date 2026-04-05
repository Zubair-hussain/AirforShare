import { Hono } from 'hono';
import { Env, Share } from '../types';
import { decompressData } from '../utils/compression';
import { analyzeNetwork } from '../utils/networkDetection';

const download = new Hono<{ Bindings: Env }>();

// GET /download/:roomCode — stream file from R2
download.get('/:roomCode', async (c) => {
  const { roomCode } = c.req.param();

  if (!/^\d{6}$/.test(roomCode)) {
    return c.json({ error: 'Invalid room code format' }, 400);
  }

  // Analyze downloader's network (for metadata only — not used to block)
  const downloaderNetwork = analyzeNetwork(c.req.raw.headers);

  // Look up share in D1
  const share = await c.env.DB.prepare(
    'SELECT * FROM shares WHERE room_code = ? AND type = ?'
  ).bind(roomCode, 'file').first<Share>();

  if (!share) {
    return c.json({ error: 'Room not found or file has been removed' }, 404);
  }

  if (Date.now() > share.expires_at) {
    // Async cleanup
    c.executionCtx.waitUntil(
      Promise.all([
        share.file_key ? c.env.R2.delete(share.file_key) : Promise.resolve(),
        c.env.DB.prepare('DELETE FROM shares WHERE id = ?').bind(share.id).run(),
      ])
    );
    return c.json({ error: 'This file has expired and is no longer available' }, 410);
  }

  // NOTE: network_private is stored as metadata only.
  // We do NOT hard-block downloads based on IP — ngrok and reverse proxies
  // make IP-based blocking unreliable. The room code IS the access control.
  // If you want strict local-only enforcement in production (non-ngrok),
  // uncomment the block below:
  //
  // if (share.network_private && !downloaderNetwork.isLocalNetwork) {
  //   return c.json({ error: 'This file is only available on the local network' }, 403);
  // }

  if (!share.file_key) {
    return c.json({ error: 'File reference missing' }, 500);
  }

  // Fetch from R2
  const object = await c.env.R2.get(share.file_key);

  if (!object) {
    return c.json({ error: 'File not found in storage' }, 404);
  }

  // Handle decompression if file was compressed on upload
  let responseBody: BodyInit = object.body;
  let fileSize = share.file_size || 0;

  if (share.is_compressed) {
    try {
      const compressedBuffer = await object.arrayBuffer();
      const decompressed = await decompressData(compressedBuffer);
      responseBody = decompressed;
      fileSize = decompressed.byteLength;
      console.log(`Decompressed: ${share.file_name} (${share.file_size}B → ${fileSize}B)`);
    } catch (err) {
      console.error('Decompression error:', err);
      return c.json({ error: 'Failed to decompress file' }, 500);
    }
  }

  const headers = new Headers();
  headers.set('Content-Type', share.file_type || 'application/octet-stream');
  headers.set(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(share.file_name || 'download')}"`
  );
  headers.set('Content-Length', String(fileSize));
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  // Tell frontend whether downloader is on same network as uploader (info only)
  headers.set('X-Local-Network', String(downloaderNetwork.isLocalNetwork));

  return new Response(responseBody, { headers });
});

export { download };