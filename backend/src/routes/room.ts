import { Hono } from 'hono';
import { Env, Share } from '../types';

const room = new Hono<{ Bindings: Env }>();

/**
 * GET /room/session — Logical Cluster Grouping
 * Instead of IP/Geo discovery, we place users into a stable "Live Session Cluster".
 */
room.get('/session', async (c) => {
  // Use the datacenter (colo) as a stable regional cluster identifier
  // Fallback to "global" if missing
  const clusterId = (c.req.raw as any).cf?.colo || 'global-v1';
  
  return c.json({
    sessionId: `cluster-${clusterId.toLowerCase()}`,
    status: 'connected',
    method: 'logical-cluster'
  });
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