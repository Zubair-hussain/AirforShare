import { Hono } from 'hono';
import { Env, Share } from '../types';
import { generateId, generateRoomCode } from '../utils/roomCode';
import { compressData, shouldCompress } from '../utils/compression';
import { analyzeNetwork, getIpHash } from '../utils/networkDetection';
import { initializeSupabase, storeShareMetadataSupabase } from '../utils/supabase';

const upload = new Hono<{ Bindings: Env }>();

upload.post('/', async (c) => {
  try {
    const maxSize = parseInt(c.env.MAX_FILE_SIZE || '10485760'); // Default 10MB
    const compressionThreshold = parseInt(c.env.COMPRESSION_THRESHOLD || '104857600');
    const expiryMinutes = parseInt(c.env.ROOM_EXPIRY_MINUTES || '30');

    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    if (file.size === 0) {
      return c.json({ error: 'File is empty. Cannot upload.' }, 400);
    }

    if (file.size > maxSize) {
      return c.json(
        { error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB` },
        413
      );
    }

    // Analyze uploader's network
    const networkInfo = analyzeNetwork(c.req.raw.headers);
    const ipHash = await getIpHash(c.req.raw.headers, c.env);
    const roomId = formData.get('roomId') as string || 'public';

    // Generate unique identifiers
    const id = generateId();
    const roomCode = generateRoomCode();

    // Get file data
    let arrayBuffer = await file.arrayBuffer();
    let fileSize = file.size;
    let isCompressed = false;
    const fileSizeOriginal = file.size;

    // Compress if file size exceeds threshold (default: 100MB)
    if (shouldCompress(file.size, compressionThreshold)) {
      const compressionResult = await compressData(arrayBuffer, compressionThreshold);
      if (compressionResult.metadata.compressed) {
        arrayBuffer = compressionResult.compressed;
        fileSize = compressionResult.compressed.byteLength;
        isCompressed = true;
        console.log(
          `Compressed: ${file.name} (${(fileSizeOriginal / 1024 / 1024).toFixed(2)}MB → ${(fileSize / 1024 / 1024).toFixed(2)}MB)`
        );
      }
    }

    const fileKey = `files/${id}/${file.name}`;

    // Upload to R2 (primary storage)
    await c.env.R2.put(fileKey, arrayBuffer, {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream',
        contentDisposition: `attachment; filename="${encodeURIComponent(file.name)}"`,
      },
      customMetadata: {
        originalName: file.name,
        shareId: id,
        isCompressed: isCompressed.toString(),
        originalSize: fileSizeOriginal.toString(),
        uploaderIp: networkInfo.userIp,
      },
    });

    // Save metadata to D1
    const now = Date.now();
    const expiresAt = now + expiryMinutes * 60 * 1000;

    await c.env.DB.prepare(`
      INSERT INTO shares (
        id, room_code, type, file_key, file_name,
        file_size, file_size_original, file_type,
        is_compressed, ip_hash, room_id, expires_at, created_at
      )
      VALUES (?, ?, 'file', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        id,
        roomCode,
        fileKey,
        file.name,
        fileSize,
        fileSizeOriginal,
        file.type,
        isCompressed ? 1 : 0,
        ipHash,
        roomId,
        expiresAt,
        now
      )
      .run();

    // ── REAL-TIME BROADCAST ───────────────────────────────────────────
    const supabase = initializeSupabase(c.env);
    const channelName = `cluster-${ipHash}-${roomId}`;

    if (supabase) {
      // Store in Supabase (Backup + Realtime trigger)
      await storeShareMetadataSupabase(supabase, {
        id,
        room_code: roomCode,
        type: 'file',
        file_name: file.name,
        file_size: fileSize,
        file_size_original: fileSizeOriginal,
        is_compressed: isCompressed,
        expires_at: expiresAt,
        created_at: now,
        ip_hash: ipHash,
        room_id: roomId,
      });

      // Explicit broadcast for instant UI update (faster than DB polling)
      const channel = supabase.channel(channelName);
      await channel.send({
        type: 'broadcast',
        event: 'new_share',
        payload: {
          id,
          roomCode,
          type: 'file',
          file_name: file.name,
          file_size: fileSize,
          file_type: file.type,
          expires_at: expiresAt,
          created_at: now
        }
      });
    }

    return c.json({
      success: true,
      roomCode,
      shareId: id,
      fileName: file.name,
      fileSize,
      fileSizeOriginal,
      isCompressed,
      compressionRatio: isCompressed
        ? ((1 - fileSize / fileSizeOriginal) * 100).toFixed(2) + '%'
        : '0%',
      expiresAt,
      downloadUrl: `/download/${roomCode}`,
      message: 'File shared instantly with your live session cluster',
    });
  } catch (err) {
    console.error('Upload error:', err);
    return c.json({ error: 'Upload failed. Please try again.' }, 500);
  }
});

// GET /upload/:id — retrieve file metadata by UUID
upload.get('/:id', async (c) => {
  const { id } = c.req.param();

  try {
    const share = await c.env.DB.prepare(
      'SELECT room_code, file_name, file_size, file_size_original, file_type, is_compressed, expires_at, created_at, network_private FROM shares WHERE id = ? AND type = "file"'
    )
      .bind(id)
      .first<any>();

    if (!share) {
      return c.json({ error: 'File share not found' }, 404);
    }

    if (Date.now() > share.expires_at) {
      return c.json({ error: 'Share has expired', expired: true }, 410);
    }

    return c.json({
      id,
      roomCode: share.room_code,
      fileName: share.file_name,
      fileSize: share.file_size,
      fileSizeOriginal: share.file_size_original,
      fileType: share.file_type,
      isCompressed: Boolean(share.is_compressed),
      downloadUrl: `/download/${share.room_code}`,
      expiresAt: share.expires_at,
      createdAt: share.created_at,
      isLocal: Boolean(share.network_private),
    });
  } catch (err) {
    console.error('File metadata retrieval error:', err);
    return c.json({ error: 'Failed to retrieve file metadata' }, 500);
  }
});

export { upload };