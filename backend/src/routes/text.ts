import { Hono } from 'hono';
import { Env } from '../types';
import { analyzeNetwork, getNetworkId } from '../utils/networkDetection';
import { initializeSupabase, storeShareMetadataSupabase } from '../utils/supabase';

const text = new Hono<{ Bindings: Env }>();

const MAX_TEXT_LENGTH = 10_000; // 10k characters max

// Generate unique ID (more reliable than external util if buggy)
function generateUniqueId() {
  return crypto.randomUUID();
}

// Generate 6-digit room code (always new)
function generateUniqueRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /text — create a text/link share
text.post('/', async (c) => {
  try {
    const expiryMinutes = parseInt(c.env.ROOM_EXPIRY_MINUTES || '30');

    let body: { content: string };

    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    if (!body.content || typeof body.content !== 'string') {
      return c.json({ error: 'No text content provided' }, 400);
    }

    const trimmed = body.content.trim();

    if (trimmed.length === 0) {
      return c.json({ error: 'Text content cannot be empty' }, 400);
    }

    if (trimmed.length > MAX_TEXT_LENGTH) {
      return c.json(
        { error: `Text too long. Maximum ${MAX_TEXT_LENGTH} characters allowed.` },
        413
      );
    }

    // Analyze uploader's network
    const networkInfo = analyzeNetwork(c.req.raw.headers);
    const networkPrivate = networkInfo.isLocalNetwork;

    // 🔥 Ensure fresh values every request
    const id = generateUniqueId();
    const roomCode = generateUniqueRoomCode();

    const now = Date.now();
    const expiresAt = now + expiryMinutes * 60 * 1000;

    // Save to D1
    await c.env.DB.prepare(
      `INSERT INTO shares 
       (id, room_code, type, content, expires_at, created_at, network_private)
       VALUES (?, ?, 'text', ?, ?, ?, ?)`
    )
      .bind(id, roomCode, trimmed, expiresAt, now, networkPrivate ? 1 : 0)
      .run();

    // ── NATIVE LAN DISCOVERY ──────────────────────────────────────────
    const networkId = await getNetworkId(c.req.raw.headers, c.env);
    
    try {
      await c.env.DB.prepare(`
        INSERT INTO local_broadcasts (
          id, subnet, room_code, share_id,
          type, expires_at, created_at
        ) VALUES (?, ?, ?, ?, 'text', ?, ?)
      `)
        .bind(
          crypto.randomUUID ? crypto.randomUUID() : id + '-bc',
          networkId,
          roomCode,
          id,
          expiresAt,
          now
        )
        .run();
    } catch (e) {
      console.error('Failed to insert local text broadcast:', e);
    }

    // Optional: Also store in Supabase for redundancy

    const supabase = initializeSupabase(c.env);

    if (supabase) {
      await storeShareMetadataSupabase(supabase, {
        id,
        room_code: roomCode,
        type: 'text',
        content: trimmed, // ✅ IMPORTANT (you were missing this)
        expires_at: expiresAt,
        created_at: now,
        network_private: networkPrivate,
      });
    }

    return c.json({
      success: true,
      roomCode,
      shareId: id,
      expiresAt,
      isLocalNetwork: networkPrivate,
      message: networkPrivate
        ? 'Text available locally on your network'
        : 'Text shared globally',
    });
  } catch (err) {
    console.error('Text share error:', err);
    return c.json(
      { error: 'Failed to create text share. Please try again.' },
      500
    );
  }
});

// GET /text/:id — fetch full text content by UUID
text.get('/:id', async (c) => {
  const { id } = c.req.param();

  try {
    const share = await c.env.DB.prepare(
      'SELECT content, expires_at, created_at, network_private FROM shares WHERE id = ? AND type = "text"'
    )
      .bind(id)
      .first<any>();

    if (!share) {
      return c.json({ error: 'Text share not found' }, 404);
    }

    if (Date.now() > share.expires_at) {
      return c.json({ error: 'Share has expired', expired: true }, 410);
    }

    return c.json({
      id,
      content: share.content,
      expiresAt: share.expires_at,
      createdAt: share.created_at,
      isLocal: Boolean(share.network_private),
    });
  } catch (err) {
    console.error('Text retrieval error:', err);
    return c.json({ error: 'Failed to retrieve text share' }, 500);
  }
});

export { text };