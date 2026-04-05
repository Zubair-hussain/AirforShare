import { Hono } from 'hono';
import { Env, Share } from '../types';
import { analyzeNetwork } from '../utils/networkDetection';

const room = new Hono<{ Bindings: Env }>();

// GET /room/:roomCode — get share metadata
// Room code is the ONLY access control required.
// Network info is returned as metadata for the frontend to use (e.g., show "same WiFi" badge).
room.get('/:roomCode', async (c) => {
  const { roomCode } = c.req.param();

  if (!/^\d{6}$/.test(roomCode)) {
    return c.json({ error: 'Invalid room code format' }, 400);
  }

  // Network info — informational only, not used to block
  const networkInfo = analyzeNetwork(c.req.raw.headers);

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

  // Determine if requester is on same network as uploader
  // Via ngrok: both will appear as non-local (expected — room code still works)
  // Via direct LAN: both will be local and same subnet
  const isLocalShare = Boolean(share.network_private);
  const requesterIsLocal = networkInfo.isLocalNetwork;
  const sameNetwork = isLocalShare && requesterIsLocal;

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
    // Network metadata (informational — frontend can show a "same WiFi" badge)
    isLocalNetworkShare: isLocalShare,
    requesterIsLocal,
    sameNetwork,
    // Timing
    expiresAt: share.expires_at,
    createdAt: share.created_at,
    // Friendly access message
    message: sameNetwork
      ? '⚡ Same network — faster transfer'
      : 'Access granted via room code',
  });
});

// GET /room/local/discover/:shareId — discover shares on local network without room code
// NOTE: This only works when both users are on the same physical LAN (not via ngrok).
// Via ngrok, this will correctly return 403 since IPs appear public — that's expected.
room.get('/local/discover/:shareId', async (c) => {
  const { shareId } = c.req.param();
  const networkInfo = analyzeNetwork(c.req.raw.headers);

  // This endpoint genuinely requires local network — it's the point of it.
  // Users on ngrok/public internet should use room codes instead.
  if (!networkInfo.isLocalNetwork) {
    return c.json(
      {
        error: 'Local network discovery is not available over public internet',
        hint: 'Use a room code to share files over the internet',
      },
      403
    );
  }

  const share = await c.env.DB.prepare(
    'SELECT * FROM shares WHERE id = ? AND network_private = 1'
  )
    .bind(shareId)
    .first<Share>();

  if (!share) {
    return c.json({ error: 'Share not found on local network' }, 404);
  }

  if (Date.now() > share.expires_at) {
    return c.json({ error: 'This share has expired', expired: true }, 410);
  }

  return c.json({
    id: share.id,
    roomCode: share.room_code,
    type: share.type,
    fileName: share.file_name,
    fileSize: share.file_size,
    fileSizeOriginal: share.file_size_original,
    isCompressed: share.is_compressed,
    fileType: share.file_type,
    content: share.type === 'text' ? share.content : undefined,
    expiresAt: share.expires_at,
    createdAt: share.created_at,
    localNetworkAccess: true,
  });
});

// POST /room/verify-access — check if user can access a share before downloading
room.post('/verify-access', async (c) => {
  const body = (await c.req.json()) as { roomCode?: string; shareId?: string };
  const networkInfo = analyzeNetwork(c.req.raw.headers);

  let share: Share | undefined;

  if (body.roomCode) {
    if (!/^\d{6}$/.test(body.roomCode)) {
      return c.json({ error: 'Invalid room code format' }, 400);
    }
    // Room code = always accessible, no IP check needed
    share = await c.env.DB.prepare(
      'SELECT * FROM shares WHERE room_code = ?'
    )
      .bind(body.roomCode)
      .first<Share>();
  } else if (body.shareId && networkInfo.isLocalNetwork) {
    // Share ID without room code = local network discovery only
    share = await c.env.DB.prepare(
      'SELECT * FROM shares WHERE id = ? AND network_private = 1'
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
    sameNetwork: Boolean(share.network_private) && networkInfo.isLocalNetwork,
  });
});

export { room };