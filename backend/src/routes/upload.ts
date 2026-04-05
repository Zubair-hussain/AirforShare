import { Hono } from 'hono';
import { Env, Share } from '../types';
import { generateId, generateRoomCode } from '../utils/roomCode';
import { compressData, shouldCompress } from '../utils/compression';
import { analyzeNetwork } from '../utils/networkDetection';
import { initializeSupabase, storeShareMetadataSupabase } from '../utils/supabase';

const upload = new Hono<{ Bindings: Env }>();

upload.post('/', async (c) => {
  try {
    const maxSize = parseInt(c.env.MAX_FILE_SIZE || '52428800');
    const compressionThreshold = parseInt(c.env.COMPRESSION_THRESHOLD || '104857600');
    const expiryMinutes = parseInt(c.env.ROOM_EXPIRY_MINUTES || '30');

    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    if (file.size > maxSize) {
      return c.json(
        { error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB` },
        413
      );
    }

    // Analyze uploader's network — stored as metadata, NOT used to restrict access
    // Via ngrok: isLocalNetwork will be false (public IP) — this is expected
    // Via direct LAN: isLocalNetwork will be true
    const networkInfo = analyzeNetwork(c.req.raw.headers);
    const networkPrivate = networkInfo.isLocalNetwork;

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
        is_compressed, expires_at, created_at, network_private
      )
      VALUES (?, ?, 'file', ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        expiresAt,
        now,
        networkPrivate ? 1 : 0  // saved as info, not enforced as blocker
      )
      .run();

    // Optional: Also store in Supabase for redundancy
    const supabase = initializeSupabase(c.env);
    if (supabase) {
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
        network_private: networkPrivate,
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
      isLocalNetwork: networkPrivate,
      // Friendly message based on actual network context
      message: networkPrivate
        ? 'File shared on your local network'
        : 'File shared — share the room code to let others in',
    });
  } catch (err) {
    console.error('Upload error:', err);
    return c.json({ error: 'Upload failed. Please try again.' }, 500);
  }
});

export { upload };