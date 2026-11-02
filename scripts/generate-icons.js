import fs from 'fs';
import zlib from 'zlib';

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([lenBuf, body, crcBuf]);
}

function generatePng(size) {
  // Create RGBA image buffer with scanline filters (filter byte 0 per line)
  const rowLen = 1 + size * 4;
  const rawData = Buffer.alloc(rowLen * size);

  for (let y = 0; y < size; y++) {
    const rowOffset = y * rowLen;
    rawData[rowOffset] = 0; // Filter: none
    for (let x = 0; x < size; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      
      // Calculate normalized coordinates
      const nx = x / size;
      const ny = y / size;
      const cx = (nx - 0.5) * 2;
      const cy = (ny - 0.5) * 2;
      const dist = Math.sqrt(cx * cx + cy * cy);

      // Default dark background #090d16
      let r = 9, g = 13, b = 22, a = 255;

      // Rounded background card
      const cornerR = 0.22;
      const inBoxX = Math.abs(cx) < (0.9 - cornerR);
      const inBoxY = Math.abs(cy) < (0.9 - cornerR);
      const dx = Math.max(0, Math.abs(cx) - (0.9 - cornerR));
      const dy = Math.max(0, Math.abs(cy) - (0.9 - cornerR));
      const cornerDist = Math.sqrt(dx * dx + dy * dy);

      if (inBoxX || inBoxY || cornerDist <= cornerR) {
        // Gradient slate dark
        r = Math.round(15 + ny * 10);
        g = Math.round(23 + ny * 8);
        b = Math.round(42 + ny * 15);

        // Keyboard body rectangle: nx in [0.15, 0.85], ny in [0.22, 0.78]
        if (nx >= 0.15 && nx <= 0.85 && ny >= 0.22 && ny <= 0.78) {
          // Inner keyboard tray
          r = 10; g = 16; b = 30;

          // Mini LCD screen at top right: nx in [0.62, 0.82], ny in [0.26, 0.38]
          if (nx >= 0.62 && nx <= 0.82 && ny >= 0.26 && ny <= 0.38) {
            // Bright cyan LCD screen
            r = 6; g = 182; b = 212;
            if (nx >= 0.64 && nx <= 0.80 && ny >= 0.28 && ny <= 0.36) {
              r = 2; g = 6; b = 23; // LCD content dark
            }
          }
          // Glowing WASD cluster keys: nx in [0.25, 0.45], ny in [0.42, 0.62]
          else if (
            (nx >= 0.32 && nx <= 0.38 && ny >= 0.42 && ny <= 0.50) || // W
            (nx >= 0.25 && nx <= 0.31 && ny >= 0.52 && ny <= 0.60) || // A
            (nx >= 0.32 && nx <= 0.38 && ny >= 0.52 && ny <= 0.60) || // S
            (nx >= 0.39 && nx <= 0.45 && ny >= 0.52 && ny <= 0.60)    // D
          ) {
            r = 34; g = 211; b = 238; // Cyan glow
          }
          // Numpad + and Enter keys: tall keys at nx in [0.77, 0.82]
          else if (
            (nx >= 0.77 && nx <= 0.82 && ny >= 0.44 && ny <= 0.58) || // 2u Plus
            (nx >= 0.77 && nx <= 0.82 && ny >= 0.60 && ny <= 0.74)    // 2u Enter
          ) {
            r = 56; g = 189; b = 248; // Sky blue
          }
          // Spacebar: nx in [0.30, 0.58], ny in [0.68, 0.74]
          else if (nx >= 0.30 && nx <= 0.58 && ny >= 0.68 && ny <= 0.74) {
            r = 14; g = 116; b = 144; // Cyan accent spacebar
          }
          // Generic keys
          else {
            const gridX = Math.floor(nx * 20) % 2;
            const gridY = Math.floor(ny * 16) % 2;
            if (gridX === 0 && gridY === 0) {
              r = 30; g = 41; b = 59; // Keycap top
            }
          }
        }
      } else {
        a = 0; // Transparent outside rounded corner
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  // PNG Signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: 6 (RGBA)
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT chunk
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate all target resolutions
const sizes = [
  { file: 'public/pwa-192x192.png', size: 192 },
  { file: 'public/pwa-512x512.png', size: 512 },
  { file: 'public/pwa-maskable-512x512.png', size: 512 },
  { file: 'public/apple-touch-icon.png', size: 180 },
];

for (const { file, size } of sizes) {
  const buf = generatePng(size);
  fs.writeFileSync(file, buf);
  console.log(`Generated ${file} (${buf.length} bytes)`);
}
