import { CompressionMetadata } from '../types';

/**
 * Compress data using gzip compression
 * Uses the pako library for compression
 */
export async function compressData(
  data: ArrayBuffer,
  compressionThreshold: number
): Promise<{
  compressed: ArrayBuffer;
  metadata: CompressionMetadata;
}> {
  const originalSize = data.byteLength;

  // Only compress if file size exceeds threshold
  if (originalSize < compressionThreshold) {
    return {
      compressed: data,
      metadata: {
        compressed: false,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 0,
        algorithm: 'none',
      },
    };
  }

  // Import pako dynamically (Cloudflare Workers compatible)
  const pako = await import('pako');
  const uint8Array = new Uint8Array(data);
  const compressed = pako.gzip(uint8Array);
  const compressedSize = compressed.byteLength;

  return {
    compressed: compressed.buffer,
    metadata: {
      compressed: true,
      originalSize,
      compressedSize,
      compressionRatio: (1 - compressedSize / originalSize) * 100,
      algorithm: 'gzip',
    },
  };
}

/**
 * Decompress gzip data
 */
export async function decompressData(
  compressedData: ArrayBuffer
): Promise<ArrayBuffer> {
  const pako = await import('pako');
  const uint8Array = new Uint8Array(compressedData);
  const decompressed = pako.ungzip(uint8Array);
  return decompressed.buffer;
}

/**
 * Check if data should be compressed
 */
export function shouldCompress(fileSize: number, threshold: number): boolean {
  return fileSize >= threshold;
}
