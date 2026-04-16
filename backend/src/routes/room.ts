import { Hono } from 'hono';
import { Env, Share } from '../types';
import { getIpHash } from '../utils/networkDetection';

const room = new Hono<{ Bindings: Env }>();

/**
 * GET /room/session — Logical Cluster Grouping
 * Generates an IP hash session for Real-time scoping
 */
room.get('/session', async (c) => {
  const ipHash = await getIpHash(c.req.raw.headers, c.env);
  const roomId = c.req.query('roomId') || 'public';
  
  return c.json({
    sessionId: `cluster-${ipHash}-${roomId}`,
    status: 'connected',
    method: 'ip-hash'
  });
});

// GET /room/shares — get all active shares for current IP Hash and Room
room.get('/shares', async (c) => {
  const ipHash = await getIpHash(c.req.raw.headers, c.env);
  const roomId = c.req.query('roomId') || 'public';
  const now = Date.now();
  const timeLimit = now - (30 * 60 * 1000); // Enforce server-side 30m constraint

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM shares WHERE ip_hash = ? AND room_id = ? AND expires_at > ? AND created_at > ? ORDER BY created_at DESC'
  )
    .bind(ipHash, roomId, now, timeLimit)
    .all<Share>();

  return c.json({ shares: results || [] });
});

// GET /room/:roomCode — get share metadata
// Room code is the ONLY access control required.
room.get('/:roomCode', async (c) => {
  const { roomCode } = c.req.param();

  if (!/^\d{6}$/.test(roomCode)) {
    return c.json({ error: 'Invalid room code format' }, 400);
  }

  const share = await c.env.DB.prepare(
    'SELECT * FROM shares WHERE room_code = ?'
  )
    .bind(roomCode)
    .first<Share>();

  if (!share) {
    return c.json({ error: 'Room not found' }, 404);
  }

  if (Date.now() > share.expires_at) {
    return c.json({ error: 'This share has expired', expired: true }, 410);
  }

  return c.json({
    roomCode: share.room_code,
    type: share.type,
    // File info
    fileName: share.file_name,
    fileSize: share.file_size,
    fileSizeOriginal: share.file_size_original,
    isCompressed: share.is_compressed,
    fileType: share.file_type,
    // Text info
    content: share.type === 'text' ? share.content : undefined,
    // Timing
    expiresAt: share.expires_at,
    createdAt: share.created_at,
    message: 'Access granted via room code',
  });
});

// POST /room/verify-access — check if user can access a share before downloading
room.post('/verify-access', async (c) => {
  const body = (await c.req.json()) as { roomCode?: string; shareId?: string };

  let share: Share | undefined;

  if (body.roomCode) {
    if (!/^\d{6}$/.test(body.roomCode)) {
      return c.json({ error: 'Invalid room code format' }, 400);
    }
    share = await c.env.DB.prepare(
      'SELECT * FROM shares WHERE room_code = ?'
    )
      .bind(body.roomCode)
      .first<Share>();
  } else if (body.shareId) {
    share = await c.env.DB.prepare(
      'SELECT * FROM shares WHERE id = ?'
    )
      .bind(body.shareId)
      .first<Share>();
  }

  if (!share) {
    return c.json({ hasAccess: false, reason: 'Share not found' });
  }

  if (Date.now() > share.expires_at) {
    return c.json({ hasAccess: false, reason: 'Share has expired' });
  }

  return c.json({
    hasAccess: true,
    type: share.type,
    fileName: share.file_name,
    fileSize: share.file_size,
    isCompressed: share.is_compressed,
  });
});

export { room };